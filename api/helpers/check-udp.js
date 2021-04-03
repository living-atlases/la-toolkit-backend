module.exports = {
  friendlyName: 'Check udp',

  description: '',

  inputs: {
    ports: {
      type: 'ref',
      required: true,
    },
    server: {
      type: 'string',
      required: true,
    },
    otherServers: {
      type: 'ref',
      required: false,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    // TODO
  },
};
