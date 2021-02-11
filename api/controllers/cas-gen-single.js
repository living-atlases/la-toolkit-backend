module.exports = {
  friendlyName: "CAS keys gen",

  description: "",

  inputs: {
    size: {
      type: "number",
      example: 256,
      description: "The size.",
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs) {
    let keys = {};
    keys.value = await sails.helpers.jwkGen.with({
      size: inputs.size,
    });
    this.res.json(keys);
  },
};
