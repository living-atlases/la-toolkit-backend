const assert = require('assert');

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
    let servers = p.servers;
    let services = p.services;
    let serviceDeploys = p.serviceDeploys;
    let variables = p.variables;
    let clusters = p.clusters || [];
    if (p.isHub) {
      assert(parentId, "parentId cannot be null");
    }
    delete p.servers;
    delete p.services;
    delete p.variables;
    delete p.serviceDeploys;
    delete p.clusters;
    let createdP = await Project.create(p).fetch();
    if (p.isHub) {
      await Project.addToCollection(createdP.id, 'parent', parentId);
    }
    let vAdded = await Variable.createEach(variables).fetch();
    let svAdded = await Service.createEach(services).fetch();
    let sAdded = await Server.createEach(servers).fetch();
    let cAdded = clusters.length
      ? await Cluster.createEach(clusters).fetch()
      : [];
    let sdAdded = await ServiceDeploy.createEach(serviceDeploys).fetch();
    if (process.env.NODE_ENV !== 'production') {
      assert(servers.length === sAdded.length);
      assert(services.length === svAdded.length);
      assert(serviceDeploys.length === sdAdded.length);
      assert(variables.length === vAdded.length);
      assert(clusters.length === cAdded.length);
    }
  },
};
