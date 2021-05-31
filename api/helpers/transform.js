const transform = require('../libs/transform');

module.exports = {
  friendlyName: 'transform conf param',

  description:
    'Transform a js parameter conf into a valid .yo-rc.json similar object.',

  sync: true,

  inputs: {
    conf: {
      type: 'json',
      required: true,
    },
  },

  fn: function (inputs, exits) {
    return exits.success(transform(inputs.conf));
  },
};
