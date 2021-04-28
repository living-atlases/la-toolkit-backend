module.exports = {
  friendlyName: 'Post deploy',

  inputs: {
    id: {
      type: 'string',
      description: 'project id',
      required: true,
    },
    desc: {
      type: 'string',
      description: 'cmd desc',
      required: true,
    },
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
    let addInv = 'post-deploy';
    let resp = await sails.helpers.ansibleAdditionalInv.with({
      type: 'postDeploy',
      id: inputs.id,
      desc: inputs.desc,
      addInv,
      cmd: inputs.cmd,
    });
    this.res.json(resp);
  },
};
