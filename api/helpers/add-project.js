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
    let servers = p.servers;
    let services = p.services;
    let serviceDeploys = p.serviceDeploys;
    let variables = p.variables;
    delete p.servers;
    delete p.services;
    delete p.variables;
    delete p.serviceDeploys;
    await Project.create(p).fetch();
    let vAdded = await Variable.createEach(variables).fetch();
    let svAdded = await Service.createEach(services).fetch();
    let sAdded = await Server.createEach(servers).fetch();
    let sdAdded = await ServiceDeploy.createEach(serviceDeploys).fetch();
    if (process.env.NODE_ENV !== 'production') {
      assert(servers.length === sAdded.length);
      assert(services.length === svAdded.length);
      assert(serviceDeploys.length === sdAdded.length);
      assert(variables.length === vAdded.length);
    }
  },
};
