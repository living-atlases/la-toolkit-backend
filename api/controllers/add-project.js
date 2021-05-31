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
    // noinspection JSUnresolvedFunction
    await sails.helpers.addProject.with({
      project: inputs.project,
    });
    let projectsAdded = await sails.helpers.populateProject();
    return this.res.json({ projects: projectsAdded });
  },
};
