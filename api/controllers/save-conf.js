const fs = require('fs');
const { appConf } = require('../libs/utils.js');

module.exports = {
  friendlyName: 'Save app conf',

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
    projectsMap: {
      type: 'json',
      description: 'The same projects as map',
      required: true,
      custom: function (value) {
        return _.isObject(value);
      },
    },
    currentProject: {
      type: 'json',
      description: 'Current project',
      required: false,
      custom: function (value) {
        return _.isObject(value);
      },
    },
    currentStep: {
      type: 'number',
      description: 'A projects list',
      required: false,
    },
    status: {
      type: 'string',
      description: 'The app status',
      required: true,
    },
    firstUsage: {
      type: 'bool',
      description: 'First use?',
      required: true,
    },
    alaInstallReleases: {
      type: 'json',
      description: 'ala-install releases',
      required: false,
    },
    generatorReleases: {
      type: 'json',
      description: 'generator releases',
      required: false,
    },
    sshKeys: {
      type: 'json',
      description: 'ssh keys',
      required: false,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs, exits) {
    try {
      fs.writeFileSync(appConf(), JSON.stringify(inputs, null, 2), {
        encoding: 'utf8',
      });
      return exits.success();
    } catch (e) {
      console.error(e);
      this.res.serverError(e);
    }
  },
};
