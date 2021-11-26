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

    console.log(inputs.cmd);

    let mode = inputs.cmd.mode === 0 ? ' --local' : inputs.cmd.mode === 1 ? ' --embedded' : ' --cluster';

    let steps = inputs.cmd.steps;

    let cmds = [];

    for (let step of steps) {
      let cmd = `la-pipelines ${step}`;
      let drs = inputs.cmd.drs;
      let hasDrs = drs != null && drs.length > 0;
      if (hasDrs) {
        cmd = cmd + ' ' + drs.join(' ');
      }
      let noDrSteps = ["archive-list", "dataset-list", "prune-datasets", "validation-report"].indexOf(step) === -1;
      let useMode = ["dwca-avro", "archive-list", "dataset-list", "prune-datasets", "validation-report"].indexOf(step) === -1;
      if (inputs.cmd.allDrs && noDrSteps) {
        cmd = cmd + ' all';
      }
      if (inputs.cmd.dryRun) {
        cmd = cmd + ' --dry-run';
      }
      if (useMode) {
        cmd = cmd + mode;
      }
      if (inputs.cmd.debug) {
        cmd = cmd + ' --debug';
      }
      cmds.push(cmd);
    }

    let concatCmds = cmds.join(" && ");
    let finalCmd = `ssh ${inputs.cmd.master} sudo su - spark -c "${concatCmds}"`;


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
        rawCmd: finalCmd,
        result: 'unknown',
        projectId: inputs.id,
        cmd: cmdCreated.id,
      }).fetch();
      cmdEntry.cmd = cmdCreated;

      let port = await ttyFreePort();
      let ttydPid = await ttyd(finalCmd, port, true, '/home/ubuntu', env, logsPrefix, logsSuffix, cmdEntry.id);

      return {
        cmdEntry: cmdEntry,
        port: port,
        ttydPid: ttydPid
      };
    } catch (e) {
      console.log(`
  ttyd cmd bash call failed ($
    {
      e
    }
  )
    `);
      throw 'termError';
    }
    // All done.
  }


};
