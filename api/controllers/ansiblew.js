const { projectShortname, ttyd } = require('../libs/utils.js');

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

  fn: async function (inputs, exits) {
    // console.log(inputs.cmd);
    var projectPath = projectShortname(inputs.cmd.shortName, inputs.cmd.uuid);
    var invPath = `/home/ubuntu/ansible/la-inventories/${projectPath}/${projectPath}-inventories/`;
    var cmd = `./ansiblew`;
    cmd = cmd + ` --alainstall=/home/ubuntu/ansible/ala-install`;
    if (inputs.cmd.debug) {
      cmd = cmd + ' --debug';
    }
    if (inputs.cmd.onlyProperties) {
      cmd = cmd + ' --properties';
    }
    if (!inputs.cmd.dryRun) {
      cmd = cmd + ' --nodryrun';
    }
    if (inputs.cmd.continueEvenIfFails) {
      cmd = cmd + ' --continue';
    }
    if (inputs.cmd.tags.length > 0) {
      cmd = cmd + ` --tags=${inputs.cmd.tags.join(',')}`;
    }
    if (inputs.cmd.skipTags.length > 0) {
      cmd = cmd + ` --skip=${inputs.cmd.skipTags.join(',')}`;
    }
    if (inputs.cmd.limitToServers.length > 0) {
      cmd = cmd + ` --limit=${inputs.cmd.limitToServers.join(',')}`;
    }

    cmd = cmd + ` ${inputs.cmd.deployServices.join(' ')}`;

    var env = {};
    // TODO move this to log directory
    env.ANSIBLE_LOG_PATH = `/home/ubuntu/ansible.log`;

    try {
      await ttyd(cmd, false, invPath, env);
      return exits.success();
    } catch (e) {
      console.log(`ttyd ansiblew call failed (${e})`);
      throw 'termError';
    }
  },
};
