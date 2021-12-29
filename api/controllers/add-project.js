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
    let projects = await sails.helpers.populateProject();
    // Notify subs socket clients
    // https://sailsjs.com/documentation/reference/web-sockets/resourceful-pub-sub/publish
    Project.publish(projects.map(p => p.id), projects, this.req);
    return this.res.json({ projects: projects });
  },
};
