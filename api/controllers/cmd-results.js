const fs = require('fs');
const p = require('path');
const {
  logsProdDevLocation,
  exitCodeFile,
  resultsFile,
  logsFile,
  logErr,
  logsTypeF,
  isBashCmdF
} = require('../libs/utils.js');
const Base64 = require('js-base64');

module.exports = {
  friendlyName: 'Get cmd results',

  description:
    'Get the results of a cmd execution in json and text format',

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
      description: 'logs suffix',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    notFound: {
      description: 'not found error.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs) {
    try {
      let cmdEntry = await CmdHistoryEntry.findOne({id: inputs.cmdHistoryEntryId}).populate('cmd');
      let duration = cmdEntry.duration != null ? `, "duration": ${cmdEntry.duration}` : "";

      // If the user close the terminal the exit before a normal exit the exit file is not created
      let exitCode = 100;
      let exFile = exitCodeFile(
        logsProdDevLocation(),
        inputs.logsPrefix,
        inputs.logsSuffix
      );
      if (fs.existsSync(exFile)) {
        // if not exit 100 (unknown)
        let exitCodeRead = fs.readFileSync(exFile, 'utf8');
        exitCode =
          exitCodeRead === 'null'
            ? 100
            : typeof parseInt(exitCodeRead) !== 'number'
            ? 100
            : parseInt(exitCodeRead);
      }

      // As the ansible callbacks are not a correct json object is like {},{},{}, we transform it to [{},{},{}]
      let isBashCmd = isBashCmdF(cmdEntry.cmd[0].type);
      let results = isBashCmd ? '[]' :
        '[' +
        fs
          .readFileSync(
            p.join(
              logsProdDevLocation(),
              resultsFile(inputs.logsPrefix, inputs.logsSuffix)
            ),
            'utf8'
          )
          .replace(/,\n$/, ']');
      let logsType = logsTypeF(cmdEntry.cmd[0].type);
      let logs = fs.readFileSync(
        logsFile(logsProdDevLocation(), inputs.logsPrefix, inputs.logsSuffix, false, logsType),
        'utf8'
      );
      let logsColorized = fs.readFileSync(
        logsFile(
          logsProdDevLocation(),
          inputs.logsPrefix,
          inputs.logsSuffix,
          true,
          logsType
        ),
        'utf8'
      );
      let logsEnc = Base64.encode(logs);
      let logsColorizedEnc = Base64.encode(logsColorized);

      const resultJson = `{ "code": ${exitCode}, "results": ${results}, "logs": "${logsEnc}", "logsColorized": "${logsColorizedEnc}" ${duration}}`;
      return this.res.json(JSON.parse(resultJson));
    } catch (e) {
      logErr(e);
      switch (e.code) {
        case 'ENOENT':
          return this.res.notFound();
        default:
          this.res.status(500);
      }
      console.log(e);
      this.res.send('Error retrieving the logs');
    }
  },
};
