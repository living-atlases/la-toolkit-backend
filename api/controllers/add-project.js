module.exports = {
  friendlyName: 'Add project',

  description: '',

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

  exits: {},

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
    // let pNew = await Project.findOrCreate({id: p.id}, p);
    let pNew = await Project.create(p).fetch();
    await Variable.createEach(variables);
    await Service.createEach(services);
    await Server.createEach(servers);
    await ServiceDeploy.createEach(serviceDeploys);
    // fetch pNew;
    return this.res.json(pNew);
  },
};
