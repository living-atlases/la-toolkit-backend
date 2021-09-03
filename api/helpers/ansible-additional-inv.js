const cp = require('child_process');
const {
  addInvRelativePath,
  addInvAbsPath,
  mainProjectPath,
  projectPath,
} = require('../libs/project-utils.js');
// noinspection JSUnresolvedFunction
module.exports = {
  friendlyName: 'Ansible additional inv',

  description: '',

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
    addInv: {
      type: 'string',
      required: true,
    },
    cmd: {
      type: 'json',
      description: 'ansible options',
      required: true,
    },
    type: {
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
    let addInv = inputs.addInv;
    let p = await Project.findOne({id: inputs.id}).populate('parent');
    let mainPath = mainProjectPath(p);
    let path = projectPath(p);

    let invDir = addInvRelativePath(mainPath, path, addInv);
    let invPath = addInvAbsPath(mainPath, path, addInv);
    let mainInvDir = `../${path}-inventories/${path}-inventory.ini`;
    let cwd = invPath;
    let rootBecome = inputs.cmd.rootBecome != null && inputs.cmd.rootBecome;

    let preCmd = sails.config.preCmd;
    // During devel set work dir
    if (preCmd !== '') {
      preCmd = preCmd.replace('exec', `exec -w ${cwd}`);

      preCmd = preCmd + ' ';
      cwd = null;
    }

    let cmd = `${preCmd}ansible-galaxy install -r requirements.yml --roles-path roles --force`;

    console.log(`cmd: ${cmd}`);
    console.log(`cwd: ${invPath}`);

    cp.execSync(cmd, {
      cwd: cwd,
    });

    let baseCmd = `ansible-playbook -i ${mainInvDir} -i inventory.yml ${addInv}.yml${rootBecome ? ' --user root --e ansible_user=root' : ''}`;

    console.log(`Resulting cwd: ${cwd}`);
    console.log(`Resulting preCmd: ${preCmd}`);

    return await sails.helpers.ansibleTtyd.with({
      useAnsiblew: false,
      type: inputs.type,
      baseCmd: baseCmd,
      projectId: inputs.id,
      mainProjectPath: mainPath,
      projectPath: path,
      desc: inputs.desc,
      invDir: invDir,
      invPath: invPath,
      cmd: inputs.cmd,
    });
  },
};
