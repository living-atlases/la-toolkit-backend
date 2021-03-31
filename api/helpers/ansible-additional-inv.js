const cp = require('child_process');
module.exports = {
  friendlyName: 'Ansible additional inv',

  description: '',

  inputs: {
    addInv: {
      type: 'string',
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
  },

  fn: async function (inputs) {
    // TODO
    let addInv = inputs.addInv;
    let projectPath = inputs.cmd.dirName;
    let invBase = '/home/ubuntu/ansible/la-inventories/';
    let invDir = `${projectPath}/${projectPath}-${addInv}/`;
    let invPath = `${invBase}${invDir}`;
    let mainInvDir = `../${projectPath}-inventories/${projectPath}-inventory.ini`;
    let cwd = invPath;

    let preCmd = sails.config.preCmd;
    // During devel set work dir
    if (preCmd !== '') {
      preCmd = preCmd.replace('exec', `exec -w ${cwd}`);

      preCmd = preCmd + ' ';
      cwd = null;
    }

    let cmd = `${preCmd}ansible-galaxy install -r requirements.yml`; // --force`;
    let err;

    console.log(`cmd: ${cmd}`);
    console.log(`cwd: ${invPath}`);

    cp.execSync(cmd, {
      cwd: cwd,
      stderr: err,
    });

    let baseCmd = `ansible-playbook -i ${mainInvDir} -i inventory.yml ${addInv}.yml`;

    console.log(`Resulting cwd: ${cwd}`);
    console.log(`Resulting preCmd: ${preCmd}`);

    let resp = await sails.helpers.ansibleTtyd.with({
      useAnsiblew: false,
      baseCmd: baseCmd,
      projectPath: projectPath,
      invDir: invDir,
      invPath: invPath,
      cmd: inputs.cmd,
    });
    return resp;
  },
};
