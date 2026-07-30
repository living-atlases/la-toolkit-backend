const fs = require('fs');
const {
  logsProdDevLocation,
  logsFile,
  logErr,
  logsTypeF,
  isBashCmdF
} = require('../libs/utils.js');
const {deployAlive} = require('../libs/ttyd-utils.js');
const {
  unknownExitCode,
  readAnsibleResults,
  ansibleExitCode,
  readExitCode,
} = require('../libs/deploy-outcome.js');
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

      // If the user close the terminal the exit before a normal exit the exit file is not created
      let exitCode = readExitCode(inputs.logsPrefix, inputs.logsSuffix);

      // A bash command has no ansible recap by definition; for the rest it is
      // only written at the play recap, so it can be missing for interrupted
      // runs or old entries. Either way, return the logs rather than failing.
      let isBashCmd = isBashCmdF(cmdEntry.cmd[0].type);
      let results = isBashCmd
        ? []
        : readAnsibleResults(inputs.logsPrefix, inputs.logsSuffix);

      // No exit code and nothing running: the run ended without anyone left to
      // record how. That happens whenever a detached deploy outlives the
      // backend that spawned it (a restart drops the in-memory close handler).
      // Ansible's own recap is the surviving witness, so believe it rather than
      // reporting a completed deploy as aborted with an all-zero summary.
      let running = deployAlive(inputs.logsPrefix, inputs.logsSuffix);
      if (exitCode === unknownExitCode && !running && results.length > 0) {
        exitCode = ansibleExitCode(results);
        console.log(
          `No exit code recorded for ${inputs.logsPrefix}-${inputs.logsSuffix}, ` +
            `derived ${exitCode} from the ansible recap`
        );
      }

      let logsType = logsTypeF(cmdEntry.cmd[0].type);
      // Old entries may have their .log files rotated/removed. Read them
      // defensively so a missing log yields empty output (a 200 with empty logs)
      // instead of an ENOENT that turns into a 404 and an error dialog.
      let readIfExists = (path) =>
        fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
      let logs = readIfExists(
        logsFile(logsProdDevLocation(), inputs.logsPrefix, inputs.logsSuffix, false, logsType)
      );
      let logsColorized = readIfExists(
        logsFile(logsProdDevLocation(), inputs.logsPrefix, inputs.logsSuffix, true, logsType)
      );
      let logsEnc = Base64.encode(logs);
      let logsColorizedEnc = Base64.encode(logsColorized);

      return this.res.json({
        code: exitCode,
        results: results,
        logs: logsEnc,
        logsColorized: logsColorizedEnc,
        running: running,
        ...(typeof cmdEntry.duration === 'number'
          ? {duration: cmdEntry.duration}
          : {}),
      });
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
