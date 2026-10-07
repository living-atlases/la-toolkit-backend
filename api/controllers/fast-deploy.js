const {
  mainProjectPath,
  projectPath,
} = require('../libs/project-utils.js');
const {runDetachedWithViewer} = require('../libs/ttyd-utils.js');
const {dateSuffix, logsProdFolder, logsFile, logsTypeF} = require('../libs/utils.js');
const {fastDeployCmd, existsWhereCmdsRun} = require('../libs/ansiblew-args.js');
const {notifyProjects} = require('../libs/notify-projects');

// Fast deploy of a docker-compose portal (la-docker-compose TASK-50, toolkit TASK-31): the
// bundles Ansible renders, cached, applied without Ansible by
// la-docker-compose/scripts/bundle/fast-deploy.sh. Same request as ansiblew (a DeployCmd),
// same detached run + log viewer, deploy-cancel and cmd-results; its logs are a bash run's.
module.exports = {
  friendlyName: 'Fast deploy',

  description: 'Render (cached) and apply the docker-compose bundles of a portal.',

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
      description: 'deploy options (a DeployCmd)',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    badRequest: {
      description: 'not something a fast deploy can do.',
      responseType: 'badRequest',
    },
    termError: {
      description: 'term error.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs, exits) {
    let p = await Project.findOne({id: inputs.id}).populate('parent');
    let mainPath = mainProjectPath(p);
    let path = projectPath(p);
    let invDir = `${mainPath}/${path}-inventories/`;
    let invPath = `/home/ubuntu/ansible/la-inventories/${invDir}`;

    let cmd;
    try {
      cmd = fastDeployCmd(
        inputs.cmd,
        p.genConf['LA_variable_ansible_user'],
        invPath,
        existsWhereCmdsRun(sails.config.preCmd)
      );
    } catch (e) {
      return exits.badRequest(e.message);
    }

    let type = 'fastDeploy';
    let logsType = logsTypeF(type);
    let logsPrefix = path;
    let logsSuffix = dateSuffix();
    let env = {
      PYTHONUNBUFFERED: '1',
      ANSIBLE_FORCE_COLOR: true,
      BASH_LOG_FILE: logsFile(logsProdFolder, path, logsSuffix, false, logsType),
      BASH_LOG_FILE_COLORIZED: logsFile(logsProdFolder, path, logsSuffix, true, logsType),
    };

    try {
      let cmdCreated = await Cmd.create({type: type, properties: inputs.cmd}).fetch();
      let cmdEntry = await CmdHistoryEntry.create({
        desc: inputs.desc,
        logsPrefix: logsPrefix,
        logsSuffix: logsSuffix,
        invDir: invDir,
        rawCmd: cmd,
        result: 'unknown',
        projectId: inputs.id,
        cmd: cmdCreated.id,
      }).fetch();
      cmdEntry.cmd = cmdCreated;
      notifyProjects();

      let {deployPid, port, ttydPid} = await runDetachedWithViewer({
        cmd: cmd,
        cwd: invPath,
        env: env,
        logsPrefix: logsPrefix,
        logsSuffix: logsSuffix,
        cmdEntryId: cmdEntry.id,
      });
      return exits.success({cmdEntry, port, ttydPid, deployPid});
    } catch (e) {
      console.log(`ttyd fast deploy call failed (${e})`);
      return exits.termError();
    }
  },
};
