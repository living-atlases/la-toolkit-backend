const {ttyd, ttyFreePort} = require('../libs/ttyd-utils.js');
const {logsProdFolder, logsFile, logsTypeF} = require('../libs/utils.js');

module.exports = {
  friendlyName: 'Term',
  description: 'Term with logs',

  inputs: {
    cmdHistoryEntryId: {
      type: 'string',
      description: 'cmdHistoryEntry id',
      required: true,
    },
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
      let cmdEntry = await CmdHistoryEntry.findOne({id: inputs.cmdHistoryEntryId}).populate('cmd');
      let logsType = logsTypeF(cmdEntry.cmd[0].type);
      let log = logsFile(
        logsProdFolder,
        inputs.logsPrefix,
        inputs.logsSuffix,
        true,
        logsType
      );
      let port = await ttyFreePort();
      let cmd = `less +G -f -r ${log}`;
      let ttydPid = await ttyd(cmd, port, false);
      this.res.json({cmd: cmd, port: port, ttydPid: ttydPid});
    } catch (e) {
      console.log(`ttyd log less call failed (${e})`);
      throw 'termError';
    }
  },
};
