const {
  pidKill,
  killByPort
} = require('../libs/ttyd-utils.js');

module.exports = {
  friendlyName: 'Term close',

  description: '',

  inputs: {
    port: {
      type: 'number',
      desc: 'ttyd port to close',
      required: false,
    },
    pid: {
      type: 'number',
      desc: 'ttyd pid to close',
      required: false,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs, exits) {
    await killByPort(inputs.port);
    await pidKill(inputs.pid);
    return exits.success();
  },
};
