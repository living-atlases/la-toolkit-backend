const fs = require('fs').promises;
const dest = `${sails.config.projectsDir}projects.json`;

module.exports = {
  friendlyName: 'Save projects conf',

  description: '',

  inputs: {
    projects: {
      type: 'json',
      description: 'A projects list',
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

  fn: async function (inputs, exits) {
    fs.writeFile(dest, JSON.stringify(inputs.projects, null, 2), {
      encoding: 'utf8',
    });

    return exits.success();
  },
};
