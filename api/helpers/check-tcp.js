module.exports = {
  friendlyName: 'Check tcp',

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
    let host = inputs.server;
    let servers =
      typeof inputs.otherServers === 'undefined' ? [host] : inputs.otherServers;
    inputs.ports.forEach(async (port) => {
      servers.forEach(async (server) => {
        // ssh $VM "nc -4 -w 120 $HOST $PORT"
        let cmd = `nc -4 -w 30 ${host} ${port}`;
        let result = await sails.helpers.sshCmd.with({
          server: server,
          cmd: cmd,
        });
      });
    });
  },
};
