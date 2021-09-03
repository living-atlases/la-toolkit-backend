const {
  mainProjectPath,
  projectPath,
} = require('../libs/project-utils.js');

module.exports = {
  friendlyName: 'Ansiblew',

  description: 'Ansiblew something.',

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
    let p = await Project.findOne({id: inputs.id}).populate('parent');
    let mainPath = mainProjectPath(p);
    let path = projectPath(p);

    let invBase = '/home/ubuntu/ansible/la-inventories/';
    let invDir = `${mainPath}/${path}-inventories/`;
    let invPath = `${invBase}${invDir}`;

    let baseCmd = `./ansiblew`;
    baseCmd = baseCmd + ` --alainstall=/home/ubuntu/ansible/ala-install`;

    let resp = await sails.helpers.ansibleTtyd.with({
      useAnsiblew: true,
      type: 'deploy',
      baseCmd: baseCmd,
      projectId: inputs.id,
      mainProjectPath: mainPath,
      projectPath: path,
      desc: inputs.desc,
      invDir: invDir,
      invPath: invPath,
      cmd: inputs.cmd,
    });

    this.res.json(resp);
  },
};
