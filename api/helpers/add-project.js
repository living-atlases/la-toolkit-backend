const assert = require('assert');

// Create-or-update every row of a project payload. The client mints every id
// itself, and a project can arrive here half-persisted: the create wizard used
// to PATCH /update-project on every keystroke, which findOrCreate'd the
// services and variables of a project whose row did not exist yet, so the
// final POST collided on those ids ("Would violate uniqueness constraint").
// Upserting lets such a project be completed instead of failing forever.
const upsertEach = async (Model, rows) => {
  const out = [];
  for (const el of rows || []) {
    const existing = await Model.findOne({ id: el.id });
    if (existing) {
      // sails-disk refuses a `set` that carries the primary key, even unchanged.
      const { id, ...values } = el;
      out.push(await Model.updateOne({ id }).set(values));
    } else {
      out.push(await Model.create(el).fetch());
    }
  }
  return out;
};

module.exports = {
  friendlyName: 'Add project',

  description: 'Add a project',

  inputs: {
    project: {
      type: 'json',
      description: 'A new project',
      required: true,
      custom: function (value) {
        return _.isObject(value);
      },
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    let p = inputs.project;
    let parentId = p.parent;
    delete p.parent;
    let servers = p.servers || [];
    let services = p.services || [];
    let serviceDeploys = p.serviceDeploys || [];
    let variables = p.variables || [];
    let clusters = p.clusters || [];
    if (p.isHub) {
      assert(parentId, 'parentId cannot be null');
    }
    delete p.servers;
    delete p.services;
    delete p.variables;
    delete p.serviceDeploys;
    delete p.clusters;
    let createdP = (await upsertEach(Project, [p]))[0];
    if (p.isHub) {
      // Idempotent for an existing membership; the junction table has no
      // uniqueness of its own, so check before adding.
      const withParent = await Project.findOne({ id: createdP.id }).populate(
        'parent'
      );
      const alreadyLinked = (withParent.parent || []).some(
        (parent) => parent.id === parentId
      );
      if (!alreadyLinked) {
        await Project.addToCollection(createdP.id, 'parent', parentId);
      }
    }
    let vAdded = await upsertEach(Variable, variables);
    let svAdded = await upsertEach(Service, services);
    let sAdded = await upsertEach(Server, servers);
    let cAdded = await upsertEach(Cluster, clusters);
    let sdAdded = await upsertEach(ServiceDeploy, serviceDeploys);
    if (process.env.NODE_ENV !== 'production') {
      assert(servers.length === sAdded.length);
      assert(services.length === svAdded.length);
      assert(serviceDeploys.length === sdAdded.length);
      assert(variables.length === vAdded.length);
      assert(clusters.length === cAdded.length);
    }
  },
};
