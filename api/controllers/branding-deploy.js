const {
  deployBrandingPath,
  mainProjectPath,
  projectPath,
} = require('../libs/project-utils.js');
const {ttyd, ttyFreePort} = require('../libs/ttyd-utils.js');
const {dateSuffix, logsProdFolder, logsFile} = require('../libs/utils.js');

module.exports = {
  friendlyName: 'Deploy branding',

  description: '',

  inputs: {
    id: {
      type: 'string',
      description: 'project id',
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
    let mainPath = mainProjectPath(p);
    let path = projectPath(p);

    let cmd = `${deployBrandingPath(mainPath, path)}deploy.sh`;
    let env = {BASH_ENV: "$HOME/.profile"};
    let logsPrefix = path;
    let logsSuffix = dateSuffix();
    let logsType = "branding-deploy";

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
        type: "brandingDeploy",
        properties: inputs.cmd,
      }).fetch();

      // CmdHistoryEntry
      let cwd = deployBrandingPath(mainPath, path);
      let cmdEntry = await CmdHistoryEntry.create({
        desc: "Branding deploy",
        logsPrefix: logsPrefix,
        logsSuffix: logsSuffix,
        // invDir: inputs.invDir,
        cwd: cwd,
        rawCmd: cmd,
        result: 'unknown',
        projectId: inputs.id,
        cmd: cmdCreated.id,
      }).fetch();
      cmdEntry.cmd = cmdCreated;

      let port = await ttyFreePort();
      let ttydPid = await ttyd(cmd, port, true, cwd, env, logsPrefix, logsSuffix, cmdEntry.id);

      return {
        cmdEntry: cmdEntry,
        port: port,
        ttydPid: ttydPid
      };
    } catch (e) {
      console.log(`ttyd cmd bash call failed (${e})`);
      throw 'termError';
    }
  }
};
