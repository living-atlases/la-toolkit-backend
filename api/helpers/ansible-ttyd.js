const {runDetachedWithViewer} = require('../libs/ttyd-utils.js');
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

    // Docker-compose deploys: target la-docker-compose (site.yml against the
    // docker_compose group, all-in-one) instead of the per-service ala-install
    // playbooks. Granularity is a deny-list passed as skip_services.
    if (aw && inputs.cmd.dockerCompose) {
      cmd = cmd + ` --ladocker=/home/ubuntu/ansible/la-docker-compose`;
      let extra = 'auto_deploy=true';
      // TEMPORARY: SDS is not yet functional under la-docker-compose (ALA is mid
      // next-gen migration; it works in neither legacy nor next-gen mode). Mirror
      // the la-docker-compose Jenkinsfile, which defers these immature services via
      // SKIP_SERVICES. Remove this once SDS deploys cleanly. Tokens use the names
      // la-docker-compose recognises (inventory group / desc key), not the toolkit's
      // internal `sds` name, so both the next-gen `sensitiveDataService` and the
      // legacy `sds` descriptors are removed from services_enabled.
      const composeDeferred = ['sensitive-data-service', 'sds-static-home', 'sds'];
      const skips = [
        ...new Set([...(inputs.cmd.skipServices || []), ...composeDeferred]),
      ];
      if (skips.length > 0) {
        extra = `${extra} skip_services=${skips.join(',')}`;
      }
      cmd = cmd + ` --extra="${extra}"`;
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
