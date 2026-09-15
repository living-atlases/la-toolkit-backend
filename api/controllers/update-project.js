// noinspection JSUnresolvedFunction
module.exports = {
  friendlyName: "Update project",

  inputs: {
    project: {
      type: "json",
      description: "A project to update",
      required: true,
      custom: function (value) {
        return _.isObject(value);
      },
    },
  },

  exits: {},

  fn: async function (inputs) {
    let p = inputs.project;
    // A PATCH for a project that was never POSTed (the create wizard saving
    // before Finish): creating its servers / clusters / services / variables
    // here leaves orphan rows that make the later add-projects collide on
    // their ids. Nothing to update; answer 200 with the current list so the
    // client does not surface an error for what is a sequencing artifact.
    if (!(await Project.findOne({ id: p.id }))) {
      sails.log.warn(`update-project: unknown project ${p.id}, ignoring`);
      let projects = await sails.helpers.populateProject();
      return this.res.json({ projects: projects });
    }
    let assoc = [];
    assoc.push([p.servers, Server]);
    assoc.push([p.clusters, Cluster]);
    assoc.push([p.services, Service]);
    assoc.push([p.serviceDeploys, ServiceDeploy]);
    assoc.push([p.variables, Variable]);
    for (const a of assoc) {
      // Waterline mutates the values it is handed (`findOrCreate` nulls the
      // id), so take the ids before the loop.
      const sentIds = a[0].map((el) => el.id);
      for (const el of a[0]) {
        const existing = await a[1].findOne({ id: el.id });
        if (!existing) {
          // console.log(`creating ${JSON.stringify(el)}`);
          // noinspection JSUnresolvedFunction
          await a[1].findOrCreate({ id: el.id }, el);
        } else if (
          existing.projectId &&
          String(existing.projectId) !== String(p.id)
        ) {
          // A row owned by another project (a hub payload carrying one of the
          // portal's clusters or servers): `set(el)` would re-parent it and the
          // portal would lose it. Rows are only ever edited by their owner.
          sails.log.warn(
            `update-project: ${a[1].identity} ${el.id} belongs to project ${existing.projectId}, not ${p.id}; skipping`
          );
        } else {
          // console.log(`updating ${JSON.stringify(el)}`);
          // sails-disk refuses a `set` that carries the primary key, even unchanged.
          const { id, ...values } = el;
          // noinspection JSUnresolvedFunction
          await a[1].updateOne({ id }).set(values);
        }
      }
      // The body carries the complete list: a row this project owns that the
      // client dropped (an unassigned deploy, a removed server) is gone. This
      // is what `set({serviceDeploys: [ids]})` used to do by nulling the
      // projectId; deleting leaves no orphans behind.
      await a[1].destroy({ projectId: p.id, id: { nin: sentIds } });
    }
    // Not update populated objects here
    delete p.parent;
    delete p.hubs;
    delete p.cmdHistoryEntries;
    // Nor the `via: projectId` collections: every row above already carries
    // its projectId, and `set({clusters: [ids]})` would re-parent onto this
    // project any id in the list (a hub body carrying the portal's cluster)
    // and null the projectId of any owned row missing from it.
    delete p.servers;
    delete p.clusters;
    delete p.services;
    delete p.serviceDeploys;
    delete p.variables;
    // sails-disk refuses a `set` that carries the primary key, even unchanged.
    const { id: projectId, ...projectValues } = p;
    // noinspection JSUnresolvedFunction
    await Project.updateOne({ id: projectId }).set(projectValues);
    let projects = await sails.helpers.populateProject();
    // Notify subs socket clients
    Project.publish(
      projects.map((p) => p.id),
      projects,
      this.req
    );
    return this.res.json({ projects: projects });
  },
};
