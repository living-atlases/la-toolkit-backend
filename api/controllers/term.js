const { ttyd } = require('../libs/utils.js');

module.exports = {
  friendlyName: 'Term',
  description: 'Term spawn',

  inputs: {},

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs, exits) {
    console.log('Executing bash');
    ttyd('bash');
    return exits.success();
  },
};
