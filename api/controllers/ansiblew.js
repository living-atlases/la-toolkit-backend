const {
  projectShortname,
  ttyd,
  logsFolder,
  resultsFile,
  logsFile,
} = require('../libs/utils.js');

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

    let now = new Date();
    let logDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19)
      .replace('T', '_');

    env.ANSIBLE_LOG_FOLDER = logsFolder;
    env.ANSIBLE_LOG_PATH = logsFile(logsFolder, logDate);
    env.ANSIBLE_LOG_FILE = logsFile('', logDate, (colorized = true));
    env.ANSIBLE_JSON_FILE = resultsFile(logDate);
    env.ANSIBLE_FORCE_COLOR = true;
    try {
      await ttyd(cmd, true, invPath, env);
      // return exits.success();
      return this.res.json(
        JSON.parse(`{ "cmd": "${cmd}", "logsSuffix": "${logDate}" }`)
      );
    } catch (e) {
      console.log(`ttyd ansiblew call failed (${e})`);
      throw 'termError';
    }
  },
};
