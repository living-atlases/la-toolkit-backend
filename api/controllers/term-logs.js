const { ttyd, ttyFreePort } = require('../libs/ttyd-utils.js');
const { logsProdFolder, logsFile } = require('../libs/utils.js');

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

  fn: async function (inputs) {
    // console.log('Executing bash');
    try {
      let log = logsFile(
        logsProdFolder,
        inputs.logsPrefix,
        inputs.logsSuffix,
        true
      );
      let port = await ttyFreePort();
      let cmd = `less +G -r ${log}`;
      await ttyd(cmd, port, false);
      this.res.json({ cmd: cmd, port: port });
    } catch (e) {
      console.log(`ttyd log less call failed (${e})`);
      throw 'termError';
    }
  },
};
