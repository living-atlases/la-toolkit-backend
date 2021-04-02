module.exports = {
  friendlyName: 'Test host services',

  description: '',

  inputs: {
    hostsServices: {
      type: 'json',
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs) {
    console.warn(inputs.hostsServices);
    // All done.
    this.res.json({});
  },
};
