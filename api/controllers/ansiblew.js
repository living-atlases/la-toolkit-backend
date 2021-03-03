module.exports = {
  friendlyName: 'Ansiblew',

  description: 'Ansiblew something.',

  inputs: {
    cmd: {
      type: 'json',
      description: 'ansiblew options',
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs) {
    // All done.
    return;
  },
};
