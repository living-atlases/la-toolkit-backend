const fs = require('fs');
const p = require('path');
const {
  logsProdDevLocation,
  exitCodeFile,
  resultsFile,
  logsFile,
} = require('../libs/utils.js');
const Base64 = require('js-base64');

module.exports = {
  friendlyName: 'Get ansiblew results',

  description:
    'Get the results of a ansiblew execution in json and text format',

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
    notFound: {
      description: 'not found error.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs) {
    try {
      // As the ansible callbacks are not a correct json object is like {},{},{}, we transform it to [{},{},{}]
      let exitCode = fs.readFileSync(
        exitCodeFile(
          logsProdDevLocation(),
          inputs.logsPrefix,
          inputs.logsSuffix
        ),
        'utf8'
      );
      let results =
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
      let logs = fs.readFileSync(
        logsFile(logsProdDevLocation(), inputs.logsPrefix, inputs.logsSuffix),
        'utf8'
      );
      let logsColorized = fs.readFileSync(
        logsFile(
          logsProdDevLocation(),
          inputs.logsPrefix,
          inputs.logsSuffix,
          true
        ),
        'utf8'
      );
      let logsEnc = Base64.encode(logs);
      let logsColorizedEnc = Base64.encode(logsColorized);
      var resultJson = `{ "code": ${exitCode}, "results": ${results}, "logs": "${logsEnc}", "logsColorized": "${logsColorizedEnc}" }`;
      return this.res.json(JSON.parse(resultJson));
    } catch (e) {
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
