const {deployAlive} = require('../libs/ttyd-utils.js');

module.exports = {
  friendlyName: 'Deploy status',

  description:
    'Report whether a detached deploy is still running. Closing the console ' +
    'asks this before reporting results: an unfinished run has no exit code ' +
    'and no play recap, and reading that absence as failure is wrong.',

  inputs: {
    logsPrefix: {
      type: 'string',
      description: 'logs prefix (identifies the run)',
      required: true,
    },
    logsSuffix: {
      type: 'string',
      description: 'logs suffix (identifies the run)',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    let running = deployAlive(inputs.logsPrefix, inputs.logsSuffix);
    return this.res.json({running: running});
  },
};
