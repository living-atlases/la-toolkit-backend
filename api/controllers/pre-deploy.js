module.exports = {
  friendlyName: 'Pre deploy',

  description: '',

  inputs: {
    cmd: {
      type: 'json',
      description: 'ansiblew options',
      required: true,
    },
  },
  exits: {
    success: {
      description: 'All done.',
    },
    termError: {
      description: 'term error.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs) {
    let addInv = 'pre-deploy';
    let resp = await sails.helpers.ansibleAdditionalInv.with({
      addInv,
      cmd: inputs.cmd,
    });
    this.res.json(resp);
  },
};
