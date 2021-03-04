const { ttyd } = require('../libs/utils.js');

module.exports = {
  friendlyName: 'Term',
  description: 'Term spawn',

  inputs: {},

  exits: {
    success: {
      description: 'All done.',
    },
    termError: {
      description: 'term error.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs, exits) {
    // console.log('Executing bash');
    try {
      await ttyd('bash');
      return exits.success();
    } catch (e) {
      console.log(`ttyd bash call failed (${e})`);
      throw 'termError';
    }
  },
};
