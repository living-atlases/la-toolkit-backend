const toIds = (rows) =>
  rows.map((row) => {
    return row.id;
  });

// noinspection JSUnresolvedFunction
module.exports = {
  friendlyName: 'Update project',

  inputs: {
    project: {
      type: 'json',
      description: 'A project to update',
      required: true,
      custom: function (value) {
        return _.isObject(value);
      },
    }
  },

  exits: {},

  fn: async function (inputs) {
    let p = inputs.project;
    let assoc = [];
    assoc.push([p.servers, Server]);
    assoc.push([p.services, Service]);
    assoc.push([p.serviceDeploys, ServiceDeploy]);
    assoc.push([p.variables, Variable]);
    p.servers = toIds(p.servers);
    p.services = toIds(p.services);
    p.serviceDeploys = toIds(p.serviceDeploys);
    p.variables = toIds(p.variables);
    for (const a of assoc) {
      for (const el of a[0]) {
        if (!(await a[1].findOne({id: el.id}))) {
          // console.log(`creating ${JSON.stringify(el)}`);
          // noinspection JSUnresolvedFunction
          await a[1].findOrCreate({id: el.id}, el);
        } else {
          // console.log(`updating ${JSON.stringify(el)}`);
          // noinspection JSUnresolvedFunction
          await a[1].updateOne({id: el.id}).set(el);
        }
      }
    }
    // Not update populated objects here
    delete p.parent;
    delete p.hubs;
    delete p.cmdHistoryEntries;
    // noinspection JSUnresolvedFunction
    await Project.updateOne({id: p.id}).set(p);
    let projects = await sails.helpers.populateProject();
    return this.res.json({projects: projects});
  },
};
