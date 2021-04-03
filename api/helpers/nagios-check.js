module.exports = {
  friendlyName: 'Nagios check',

  description: '',

  inputs: {
    server: {
      type: 'string',
      required: true,
    },
    check: {
      type: 'string',
      required: true,
    },
    args: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    if (inputs.check !== 'http') {
      throw 'Wrong nagios plugin';
    }

    let cmd = `/usr/lib/nagios/plugins/check_${inputs.check} ${inputs.args}`;
    // console.log(cmd);
    let result = await sails.helpers.sshCmd.with({
      server: inputs.server,
      cmd: cmd,
    });

    return result;
  },
};
