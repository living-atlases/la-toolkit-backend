const {killDeploy} = require('../libs/ttyd-utils.js');

module.exports = {
  friendlyName: 'Deploy cancel',

  description:
    'Cancel a running detached deploy by killing its process tree. Closing the ' +
    'terminal only stops the viewer; this is the explicit way to abort the deploy.',

  inputs: {
    logsPrefix: {
      type: 'string',
      description: 'logs prefix (identifies the deploy pidfile)',
      required: true,
    },
    logsSuffix: {
      type: 'string',
      description: 'logs suffix (identifies the deploy pidfile)',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    let killed = await killDeploy(inputs.logsPrefix, inputs.logsSuffix);
    return this.res.json({killed: killed});
  },
};
