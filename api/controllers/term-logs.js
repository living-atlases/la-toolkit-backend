const { ttyd } = require('../libs/utils.js');
const { logsFolder, logsFile } = require('../libs/utils.js');

module.exports = {
  friendlyName: 'Term',
  description: 'Term with logs',

  inputs: {
    logsPrefix: {
      type: 'string',
      description: 'logs prefix',
      required: true,
    },
    logsSuffix: {
      type: 'string',
      description: 'ansiblew logs suffix',
      required: true,
    },
  },

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
      let log = logsFile(
        logsFolder,
        inputs.logsPrefix,
        inputs.logsSuffix,
        true
      );
      await ttyd(`less +G -r ${log}`, true);
      return exits.success();
    } catch (e) {
      console.log(`ttyd log less call failed (${e})`);
      throw 'termError';
    }
  },
};
