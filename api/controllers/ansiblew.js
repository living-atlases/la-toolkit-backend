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
    let projectPath = inputs.cmd.dirName;
    let invBase = '/home/ubuntu/ansible/la-inventories/';
    let invDir = `${projectPath}/${projectPath}-inventories/`;
    let invPath = `${invBase}${invDir}`;

    let baseCmd = `./ansiblew`;
    baseCmd = baseCmd + ` --alainstall=/home/ubuntu/ansible/ala-install`;

    let resp = await sails.helpers.ansibleTtyd.with({
      useAnsiblew: true,
      baseCmd: baseCmd,
      projectPath: projectPath,
      invDir: invDir,
      invPath: invPath,
      cmd: inputs.cmd,
    });
    this.res.json(resp);
  },
};
