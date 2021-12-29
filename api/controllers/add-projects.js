module.exports = {
  friendlyName: 'Add project',

  description: '',

  inputs: {
    projects: {
      type: 'json',
      description: 'A list of new projects',
      required: true,
      custom: function (value) {
        return _.isObject(value);
      },
    },
  },

  exits: {},

  fn: async function (inputs) {
    for (let p of inputs.projects) {
      // noinspection JSUnresolvedFunction
      await sails.helpers.addProject.with({
        project: p,
      });
    }
    let projects = await sails.helpers.populateProject();
    // Notify subs socket clients
    Project.publish(projects.map(p => p.id), projects, this.req);
    return this.res.json({ projects: projects });
  },
};
