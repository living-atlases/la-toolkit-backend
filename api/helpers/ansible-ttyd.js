const {runDetachedWithViewer} = require('../libs/ttyd-utils.js');
const {ansiblewArgs} = require('../libs/ansiblew-args.js');
const {logsProdFolder, resultsFile, logsFile, dateSuffix} = require('../libs/utils.js');
const { notifyProjects } = require('../libs/notify-projects');

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
    let projectPath = inputs.projectPath;
    let cmd = inputs.baseCmd + ansiblewArgs(inputs.cmd, inputs.useAnsiblew, inputs.ansibleUser);

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
    // Force line-buffered stdout for ansible-playbook (and anything it shells
    // out through). Without this, Python block-buffers stdout when it isn't a
    // TTY; if the process is killed mid-run (e.g. a long, silent healthcheck
    // task whose SSH session dies) whatever is still sitting in that buffer —
    // including the final PLAY RECAP or a fatal error — is lost, and the saved
    // log looks truncated instead of explaining what happened.
    env.PYTHONUNBUFFERED = '1';
    // Make echo-bash tee the full colorized terminal stream to a log file. This
    // is the SAME file term-logs / cmd-results read back
    // (logsFile(..., colorized=true, 'ansible')), so every disposable `less -f`
    // viewer tails exactly what the deploy prints — live and on reconnect.
    env.BASH_LOG_FILE = logsFile(logsProdFolder, projectPath, logDate, false, logsType);
    env.BASH_LOG_FILE_COLORIZED = logsFile(logsProdFolder, projectPath, logDate, true, logsType);
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
      // A new run in the project history.
      notifyProjects();

      // Run the deploy DETACHED from the terminal, with the console as a mere
      // live-follow viewer of its log. A dropped websocket can no longer SIGHUP
      // and cancel it — it runs to completion and records its own exit code
      // (see spawnDetached); only deploy-cancel stops it.
      let {deployPid, port, ttydPid} = await runDetachedWithViewer({
        cmd: cmd,
        cwd: inputs.invPath,
        env: env,
        logsPrefix: logsPrefix,
        logsSuffix: logsSuffix,
        cmdEntryId: cmdEntry.id,
      });

      return {
        cmdEntry: cmdEntry,
        port: port,
        ttydPid: ttydPid,
        deployPid: deployPid
      };
    } catch (e) {
      console.log(`ttyd ansiblew call failed (${e})`);
      throw 'termError';
    }
  },
};
