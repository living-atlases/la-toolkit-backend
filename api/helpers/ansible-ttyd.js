const {ttyd, ttyFreePort} = require('../libs/ttyd-utils.js');
const {logsProdFolder, resultsFile, logsFile, dateSuffix} = require('../libs/utils.js');

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
    mainProjectPath: {
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
    ansibleUser: {
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
    // let mainProjectPath = inputs.mainProjectPath;
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

    cmd = cmd + ` --user ${inputs.ansibleUser}`;

    if (aw) {
      cmd = cmd + ` ${inputs.cmd.deployServices.join(' ')}`;
    }

    let env = {};

    let logDate = dateSuffix();
    let logsType = "ansible";

    env.ANSIBLE_LOG_FOLDER = logsProdFolder;
    env.ANSIBLE_LOG_PATH = logsFile(logsProdFolder, projectPath, logDate, false, logsType);
    env.ANSIBLE_LOG_FILE = logsFile(
      '',
      projectPath,
      logDate,
      true,
      logsType
    );
    env.ANSIBLE_JSON_FILE = resultsFile(projectPath, logDate);
    env.ANSIBLE_FORCE_COLOR = true;
    let logsPrefix = projectPath;
    let logsSuffix = logDate;
    try {
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

      let port = await ttyFreePort();
      let ttydPid = await ttyd(cmd, port, true, inputs.invPath, env, logsPrefix, logsSuffix, cmdEntry.id);

      return {
        cmdEntry: cmdEntry,
        port: port,
        ttydPid: ttydPid
      };
    } catch (e) {
      console.log(`ttyd ansiblew call failed (${e})`);
      throw 'termError';
    }
  },
};
