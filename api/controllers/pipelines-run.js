const {
  projectPath,
} = require('../libs/project-utils.js');
const {ttyd, ttyFreePort} = require('../libs/ttyd-utils.js');
const {dateSuffix, logsProdFolder, logsFile} = require('../libs/utils.js');

module.exports = {

  friendlyName: 'Pipelines run',

  description: 'Execution of la-pipelines',

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
      description: 'cmd options',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },


  fn: async function (inputs) {
    // noinspection JSUnresolvedFunction
    let p = await Project.findOne({id: inputs.id}).populate('parent');
    let path = projectPath(p);

    let cmd = `ssh ${inputs.cmd.master} sudo su - spark -c 'la-pipelines `;

    if (inputs.cmd.steps != null && inputs.cmd.steps.length > 0) {
      cmd = cmd + inputs.cmd.steps[0];
    }
    if (inputs.cmd.drs != null && inputs.cmd.drs.length > 0) {
      cmd = cmd + ' ' + inputs.cmd.drs; // .join(' ');
    }
    if (inputs.cmd.allSteps) {
      cmd = cmd + ' do-all';
    }
    if (inputs.cmd.allDrs) {
      cmd = cmd + ' all';
    }
    if (inputs.cmd.dryRun) {
      cmd = cmd + ' --dry-run';
    }
    if (inputs.cmd.debug) {
      cmd = cmd + ' --debug';
    }
    cmd = cmd + "'";

    let env = {BASH_ENV: "$HOME/.profile"};
    let logsPrefix = path;
    let logsSuffix = dateSuffix();
    let logsType = "la-pipelines";

    env.BASH_LOG_FILE = logsFile(logsProdFolder, path, logsSuffix, false, logsType);
    env.BASH_LOG_FILE_COLORIZED = logsFile(
      logsProdFolder,
      path,
      logsSuffix,
      true,
      logsType
    );

    try {
      // Cmd
      let cmdCreated = await Cmd.create({
        type: "laPipelines",
        properties: inputs.cmd,
      }).fetch();

      // CmdHistoryEntry
      let cmdEntry = await CmdHistoryEntry.create({
        desc: inputs.desc,
        logsPrefix: logsPrefix,
        logsSuffix: logsSuffix,
        // invDir: inputs.invDir,
        rawCmd: cmd,
        result: 'unknown',
        projectId: inputs.id,
        cmd: cmdCreated.id,
      }).fetch();
      cmdEntry.cmd = cmdCreated;

      let port = await ttyFreePort();
      let ttydPid = await ttyd(cmd, port, true, '/home/ubuntu', env, logsPrefix, logsSuffix, cmdEntry.id);

      return {
        cmdEntry: cmdEntry,
        port: port,
        ttydPid: ttydPid
      };
    } catch (e) {
      console.log(`ttyd cmd bash call failed (${e})`);
      throw 'termError';
    }
    // All done.
    return;
  }


};
