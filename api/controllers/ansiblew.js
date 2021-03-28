const {
  ttyd,
  logsProdFolder,
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
    let projectPath = inputs.cmd.dirName;
    let invBase = '/home/ubuntu/ansible/la-inventories/';
    let invDir = `${projectPath}/${projectPath}-inventories/`;
    let invPath = `${invBase}${invDir}`;
    let cmd = `./ansiblew`;
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

    env.ANSIBLE_LOG_FOLDER = logsProdFolder;
    env.ANSIBLE_LOG_PATH = logsFile(logsProdFolder, projectPath, logDate);
    env.ANSIBLE_LOG_FILE = logsFile(
      '',
      projectPath,
      logDate,
      (colorized = true)
    );
    env.ANSIBLE_JSON_FILE = resultsFile(projectPath, logDate);
    env.ANSIBLE_FORCE_COLOR = true;
    let logsPrefix = projectPath;
    let logsSuffix = logDate;
    try {
      await ttyd(cmd, true, invPath, env, logsPrefix, logsSuffix);
      // return exits.success();
      return this.res.json(
        JSON.parse(
          `{ "cmd": "${cmd}", "logsPrefix": "${logsPrefix}", "logsSuffix": "${logsSuffix}", "invDir": "${invDir}" }`
        )
      );
    } catch (e) {
      console.log(`ttyd ansiblew call failed (${e})`);
      throw 'termError';
    }
  },
};
