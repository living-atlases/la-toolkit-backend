const { ttyd, ttyFreePort } = require('../libs/ttyd-utils.js');
const { logsProdFolder, resultsFile, logsFile } = require('../libs/utils.js');

module.exports = {
  friendlyName: 'ansible with ttyd',

  description: 'Helper to run ansible commands with ttd',

  inputs: {
    baseCmd: {
      type: 'string',
      required: true,
    },
    invDir: {
      type: 'string',
      required: true,
    },
    invPath: {
      type: 'string',
      required: true,
    },
    cmd: {
      type: 'json',
      description: 'ansiblew options',
      required: true,
    },
    useAnsiblew: {
      type: 'bool',
      required: true,
    },
    projectId: {
      type: 'string',
      required: true,
    },
    projectPath: {
      type: 'string',
      required: true,
    },
    desc: {
      type: 'string',
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
    let cmd = inputs.baseCmd;
    let projectPath = inputs.projectPath;
    let aw = inputs.useAnsiblew;
    let sep = aw ? '=' : ' ';

    if (inputs.cmd.debug) {
      cmd = cmd + (aw ? ' --debug' : ' --vvvv');
    }
    if (inputs.cmd.onlyProperties) {
      cmd = cmd + (aw ? ' --properties' : ' --tags properties');
    }
    if (inputs.cmd.dryRun) {
      cmd = cmd + (aw ? '' : ' --check');
    }
    if (!inputs.cmd.dryRun) {
      cmd = cmd + (aw ? ' --nodryrun' : '');
    }
    if (inputs.cmd.continueEvenIfFails) {
      cmd = cmd + (aw ? ' --continue' : '');
    }
    if (inputs.cmd.tags.length > 0) {
      cmd = cmd + ` --tags${sep}${inputs.cmd.tags.join(',')}`;
    }
    if (inputs.cmd.skipTags.length > 0) {
      cmd =
        cmd +
        ` --skip${aw ? '' : '-tags'}${sep}${inputs.cmd.skipTags.join(',')}`;
    }
    if (inputs.cmd.limitToServers.length > 0) {
      cmd = cmd + ` --limit${sep}${inputs.cmd.limitToServers.join(',')}`;
    }

    if (aw) {
      cmd = cmd + ` ${inputs.cmd.deployServices.join(' ')}`;
    }

    let env = {};

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
       true
    );
    env.ANSIBLE_JSON_FILE = resultsFile(projectPath, logDate);
    env.ANSIBLE_FORCE_COLOR = true;
    let logsPrefix = projectPath;
    let logsSuffix = logDate;
    try {
      let port = await ttyFreePort();
      await ttyd(cmd, port, true, inputs.invPath, env, logsPrefix, logsSuffix);

      // Cmd
      let cmdCreated = await Cmd.create({
        type: inputs.type,
        properties: inputs.cmd,
      }).fetch();

      // CmdHistoryEntry
      let cmdEntry = await CmdHistoryEntry.create({
        desc: inputs.desc,
        logsPrefix: logsPrefix,
        logsSuffix: logsSuffix,
        invDir: inputs.invDir,
        rawCmd: cmd,
        result: 'unknown',
        projectId: inputs.projectId,
        cmd: cmdCreated.id,
      }).fetch();
      cmdEntry.cmd = cmdCreated;

      return {
        cmdEntry: cmdEntry,
        port: port,
      };
    } catch (e) {
      console.log(`ttyd ansiblew call failed (${e})`);
      throw 'termError';
    }
  },
};
