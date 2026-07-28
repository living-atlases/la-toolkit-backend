const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;
const execFileSync = require('child_process').execFileSync;
const fs = require('fs');
const PortPool = require('./port-pool.js');
const sails = require('sails');
const kill = require('tree-kill');
const {delay, exitCodeFile, deployPidFile, logsProdDevLocation, logErr} = require('./utils.js');
const findPidFromPort = require("find-pid-from-port")
const {parse: shellParse} = require('shell-quote');
const perf = require('execution-time')();

const portPool = new PortPool(
  sails.config.ttydMinPort,
  sails.config.ttydMaxPort
);
const ttyFreePort = () => portPool.getNext();

// Container name for docker-exec setups, derived from preCmd like
// "docker exec -u ubuntu la-toolkit-dev". Empty preCmd (production) runs the
// commands directly on the host, so there is no container.
const dockerContainer = () => {
  const pre = (sails.config.preCmd || '').trim();
  return pre === '' ? null : pre.split(/\s+/).pop();
};

// eslint-disable-next-line no-unused-vars
const pidKill = async (pid) => {
  return new Promise((resolve) => {
    if (typeof pid === 'number') {
      console.log(`Killing proc with pid ${pid}`);
      kill(pid, 'SIGKILL', (kerr) => {
        if (kerr) {
          logErr(kerr);
          resolve('termError');
        }
        resolve();
      });
    } else {
      console.log('Not killing unknown pid');
      resolve();
    }
  });
};

const killByPort = async (port) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      const pids = await findPidFromPort(port)
      for (let pid of pids) {
        await pidKill(pid);
      }
      // console.log(pids.all)
      //=> [1234, 5678]
    } else {
      // As "Kill docker exec command will not terminate the spawned process"
      // https://github.com/moby/moby/issues/9098
      // `docker container top` reports HOST-namespace pids of in-container
      // processes, which ARE killable from the host. Use the actual container
      // from preCmd (e.g. la-toolkit-dev), not a hardcoded name.
      const container = dockerContainer() || 'la-toolkit';
      let cmd = `for i in $(docker container top ${container} | grep "\\-p ${port}" | awk '{print $2}'); do kill $i; done`;
      execSync(cmd);
    }
  } catch (error) {
    logErr(error);
    //=> "Couldn't find a process with port `8017`"
  }
}
const ttyd = async (
  cmd,
  port,
  once = true,
  cwd = '/home/ubuntu',
  env = {},
  logsPrefix,
  logsSuffix,
  cmdEntryId
  // process.env
) => {
  try {
    // once here, all resources are available
    console.log(`cwd: ${cwd}`);
    console.log(`env: ${JSON.stringify(env)}`);
    console.log(
      `port ${port} of ports: ${sails.config.ttydMinPort}-${sails.config.ttydMaxPort}`
    );

    let preCmd = sails.config.preCmd;

    console.log(`preCmd: ${preCmd}`);
    // During devel set work dir
    if (preCmd !== '') {
      preCmd = preCmd.replace('exec', `exec -w ${cwd}`);

      if (Object.entries(env).length !== 0) {
        let envDocker = '';
        for (let [key, value] of Object.entries(env)) {
          envDocker = envDocker + ` --env ${key}=${value}`;
        }
        preCmd = preCmd.replace('exec', `exec ${envDocker.trim()}`);
      }

      preCmd = preCmd + ' ';
      cwd = null;
    }

    console.log(`Resulting cwd: ${cwd}`);
    console.log(`Resulting preCmd: ${preCmd}`);

    const extraArgs = `${once ? '--once ' : ''}`;
    // -t disableReconnect=true
    // --max-clients 1
    // --ping-interval keeps the websocket non-idle during long, quiet phases
    // (docker image pulls emit no output for minutes) so the live view stays
    // attached. The deploy itself no longer depends on this connection (it runs
    // detached via spawnDetached), but this avoids needless "Connection Closed".
    const scriptArgs = `ttyd -t scrollback=50000 -t fontSize=14 -t disableReconnect=false -t disableLeaveAlert=true --ping-interval 30 --check-origin -p ${port} ${extraArgs}/usr/local/bin/echo-bash ${cmd}`;

    // Tokenize respecting quotes so a quoted argument that contains spaces
    // (e.g. --extra="auto_deploy=true skip_services=a,b,c", exactly as
    // la-docker-compose's own ansiblew tests invoke it) survives as a SINGLE
    // argv entry. A naive .split(' ') shattered it on the inner space, so
    // ansiblew's docopt saw `skip_services=...` as a stray positional and
    // aborted with a Usage error. shell-quote strips the quotes and keeps the
    // value intact. Non-string tokens (operators/globs) are stringified back so
    // behaviour is unchanged for everything else.
    const ttydCmd = shellParse(`${preCmd}${scriptArgs}`).map((tok) =>
      typeof tok === 'string' ? tok : tok.pattern || tok.op || String(tok)
    );

    console.log(`cmd: ${ttydCmd.join(' ')}`);
    perf.start();
    const ttyd = spawn(ttydCmd.shift(), ttydCmd, {
      cwd: cwd,
      env: {...process.env, ...env, NODE_DEBUG: 'child_process'},
    });

    console.log(`ttyd pid: ${ttyd.pid}`);

    // Wait til listenning
    /* It seems that this not work well under docker
       waitOnOpts.reverse = false;
       waitOnOpts.timeout = 2000;
       await waitOn(waitOnOpts); */

    await delay(2000);

    ttyd.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    ttyd.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    ttyd.on('close', async (code) => {
      console.log(`child process exited with code ${code} with ${ttyd.pid}`);
      const results = perf.stop();
      console.log(`Cmd duration: ${results.time}`);
      if (cmdEntryId != null) {
        await CmdHistoryEntry.updateOne({id: cmdEntryId}).set({duration: results.time});
      }
      if (
        typeof logsSuffix !== 'undefined' &&
        typeof logsPrefix !== 'undefined'
      ) {
        fs.writeFileSync(
          exitCodeFile(logsProdDevLocation(), logsPrefix, logsSuffix),
          `${code}`,
          {
            encoding: 'utf8',
          }
        );
      }
    });
    return ttyd.pid;
  } catch (werr) {
    console.log(`ttyd call failed (${werr})`);
    //throw Error(werr);
  }
  console.log('finished ttyd call');
};

// Launch a deploy as a DETACHED background process, decoupled from any ttyd
// terminal. Previously the deploy ran as ttyd's child under `--once`, so a
// dropped websocket made ttyd exit and SIGHUP the deploy (exit 255) — long,
// quiet docker-compose deploys were being cancelled by mere disconnects.
//
// Here echo-bash runs detached (its own process group, unref'd from the request
// lifecycle). It tees the colorized terminal stream to BASH_LOG_FILE_COLORIZED,
// which every disposable `less -f` viewer tails, and we record the real exit
// code + duration on close — exactly as the old ttyd close handler did — so
// cmd-results can report completion. Killing a viewer never touches this.
//
// Note: with a non-empty preCmd (docker-exec setups) the returned pid — and so
// the pidfile — is the host-side `docker exec` client; killing it does not stop
// the in-container process (moby#9098). killDeploy handles that case by
// signalling from inside the container instead.
const spawnDetached = async (
  cmd,
  cwd = '/home/ubuntu',
  env = {},
  logsPrefix,
  logsSuffix,
  cmdEntryId
) => {
  try {
    let preCmd = sails.config.preCmd;
    if (preCmd !== '') {
      preCmd = preCmd.replace('exec', `exec -w ${cwd}`);
      if (Object.entries(env).length !== 0) {
        let envDocker = '';
        for (let [key, value] of Object.entries(env)) {
          envDocker = envDocker + ` --env ${key}=${value}`;
        }
        preCmd = preCmd.replace('exec', `exec ${envDocker.trim()}`);
      }
      preCmd = preCmd + ' ';
      cwd = null;
    }

    const scriptArgs = `${preCmd}/usr/local/bin/echo-bash ${cmd}`;
    const deployCmd = shellParse(scriptArgs).map((tok) =>
      typeof tok === 'string' ? tok : tok.pattern || tok.op || String(tok)
    );

    console.log(`detached deploy cmd: ${deployCmd.join(' ')}`);
    const perfDeploy = require('execution-time')();
    perfDeploy.start();
    const child = spawn(deployCmd.shift(), deployCmd, {
      cwd: cwd,
      env: {...process.env, ...env},
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    console.log(`detached deploy pid: ${child.pid}`);

    // Persist the pid so a later cancel can kill the deploy's process group.
    try {
      fs.writeFileSync(
        deployPidFile(logsProdDevLocation(), logsPrefix, logsSuffix),
        `${child.pid}`,
        {encoding: 'utf8'}
      );
    } catch (perr) {
      logErr(perr);
    }

    child.on('close', async (code) => {
      console.log(`detached deploy exited with code ${code} (pid ${child.pid})`);
      const results = perfDeploy.stop();
      console.log(`Deploy duration: ${results.time}`);
      if (cmdEntryId != null) {
        await CmdHistoryEntry.updateOne({id: cmdEntryId}).set({
          duration: results.time,
        });
      }
      if (
        typeof logsSuffix !== 'undefined' &&
        typeof logsPrefix !== 'undefined'
      ) {
        // The exit-code file is what cmd-results reads to report completion.
        fs.writeFileSync(
          exitCodeFile(logsProdDevLocation(), logsPrefix, logsSuffix),
          `${code}`,
          {encoding: 'utf8'}
        );
      }
    });

    return child.pid;
  } catch (werr) {
    console.log(`detached deploy call failed (${werr})`);
  }
};

// Run a command DETACHED plus a disposable ttyd viewer that live-follows its
// colorized log. This is the shape every long-running job (ansible deploy,
// branding deploy, pipelines) uses: the job survives the console being closed
// or its websocket dropping, and can only be stopped through killDeploy.
//
// env must carry BASH_LOG_FILE_COLORIZED (echo-bash tees the terminal stream
// there); the viewer just tails it.
const runDetachedWithViewer = async ({
  cmd,
  cwd,
  env,
  logsPrefix,
  logsSuffix,
  cmdEntryId,
}) => {
  const deployPid = await spawnDetached(
    cmd,
    cwd,
    env,
    logsPrefix,
    logsSuffix,
    cmdEntryId
  );

  // `tail -F` retries until the log appears (echo-bash's tee creates it
  // in-container), so no pre-create is needed — and the backend can't write
  // that path anyway when the job runs via `docker exec`. `-n +1` prints from
  // the start, then follows; raw ANSI renders as colors in xterm.
  const viewerCmd = `tail -n +1 -F ${env.BASH_LOG_FILE_COLORIZED}`;
  // once=false: keep ttyd alive after a client disconnect so the xterm client
  // auto-reconnects (disableReconnect=false) and re-follows the log, instead of
  // a dead "Connection Closed". term-close tears it down on dialog close.
  const port = await ttyFreePort();
  const ttydPid = await ttyd(viewerCmd, port, false);

  return {deployPid: deployPid, port: port, ttydPid: ttydPid};
};

// Run `script` inside the container, returning its stdout. execFileSync (argv,
// no host shell) so the container name and script are never re-parsed here.
// Never throws on a non-zero exit: pgrep/grep return 1 for "no match", which is
// an answer, not an error.
const containerSh = (container, script, args = []) => {
  try {
    return execFileSync(
      'docker',
      // 'sh' after the script is $0; the rest land in the script as $1, $2...
      ['exec', container, 'sh', '-c', script, 'sh', ...args],
      {encoding: 'utf8'}
    ).trim();
  } catch (error) {
    if (error.status !== 1) {
      logErr(error);
    }
    return (error.stdout || '').toString().trim();
  }
};

const parsePids = (out) =>
  out
    .split('\n')
    .map((l) => parseInt(l.trim(), 10))
    .filter((pid) => !Number.isNaN(pid));

// Pids of THIS run inside the container. The job's processes (echo-bash, the
// ansiblew/deploy.sh wrapper and every child they fork) inherit
// BASH_LOG_FILE_COLORIZED, whose path carries the run's unique logsSuffix — so
// scanning /proc/*/environ scopes the kill to one run instead of nuking any
// ansible in the container. It also can't self-match: the scanning shell has no
// such variable in its own environment.
//
// `docker exec` runs as the same uid as the job (ubuntu), so environ is readable.
const containerRunPids = (container, logsSuffix) =>
  parsePids(
    containerSh(
      container,
      'for d in /proc/[0-9]*; do grep -qaF "$1" "$d/environ" 2>/dev/null && echo "${d#/proc/}"; done',
      [logsSuffix]
    )
  );

// Fallback for runs started before environ scoping existed. The bracket trick
// ([a]nsiblew) keeps the pattern from matching the cmdline of the very shell
// that runs it — a plain `-f ansiblew` self-matches and kills it, which is why
// cancel used to report failure even when it worked.
const containerAnsiblePids = (container) =>
  parsePids(
    containerSh(container, "pgrep -f '[a]nsiblew|[a]nsible-playbook' || true")
  );

// Grace period between SIGTERM and SIGKILL when cancelling a deploy.
const killGraceMs = 3000;

// Signal 0 doesn't deliver anything, it just probes that the pid is ours and
// alive — so we never report a cancel we didn't actually make.
const pidAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (unused) {
    return false;
  }
};

const treeKill = (pid, signal) =>
  new Promise((resolve) => {
    kill(pid, signal, (kerr) => {
      if (kerr) {
        logErr(kerr);
      }
      resolve();
    });
  });

// Cancel a running detached deploy. Returns true only when live processes were
// found and signalled, so the UI can tell "cancelled" from "nothing to cancel".
const killDeploy = async (logsPrefix, logsSuffix) => {
  try {
    const container = dockerContainer();
    if (container != null) {
      // docker-exec setup: the pidfile holds the host-side `docker exec` client
      // pid, which does NOT control the in-container job (moby#9098), so signal
      // it from inside the container instead.
      let pids = containerRunPids(container, logsSuffix);
      if (pids.length === 0) {
        pids = containerAnsiblePids(container);
      }
      if (pids.length === 0) {
        console.log(`No running deploy found in ${container} for ${logsSuffix}`);
        return false;
      }
      console.log(`Cancelling deploy ${logsSuffix}, pids: ${pids.join(' ')}`);
      containerSh(container, `kill -TERM ${pids.join(' ')} 2>/dev/null || true`);
      // echo-bash and ansiblew are bash wrappers, and bash defers SIGTERM while
      // a foreground child runs — so give them a moment, then force whatever is
      // still alive.
      await delay(killGraceMs);
      const survivors = parsePids(
        containerSh(
          container,
          `for p in ${pids.join(' ')}; do [ -d /proc/$p ] && echo $p; done`
        )
      );
      if (survivors.length > 0) {
        console.log(
          `Deploy ${logsSuffix} survived TERM, killing ${survivors.join(' ')}`
        );
        containerSh(
          container,
          `kill -KILL ${survivors.join(' ')} 2>/dev/null || true`
        );
      }
      return true;
    }
    // direct setup (empty preCmd): kill the detached process tree by pid.
    const pidFile = deployPidFile(
      logsProdDevLocation(),
      logsPrefix,
      logsSuffix
    );
    if (!fs.existsSync(pidFile)) {
      console.log(`No deploy pidfile at ${pidFile}`);
      return false;
    }
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
    if (Number.isNaN(pid) || !pidAlive(pid)) {
      console.log(`No live deploy for pid ${pid}`);
      return false;
    }
    // Same TERM-then-KILL escalation as above, on the whole process tree.
    await treeKill(pid, 'SIGTERM');
    await delay(killGraceMs);
    if (pidAlive(pid)) {
      await treeKill(pid, 'SIGKILL');
    }
    return true;
  } catch (error) {
    logErr(error);
    return false;
  }
};

module.exports = {
  ttyd,
  spawnDetached,
  runDetachedWithViewer,
  killDeploy,
  ttyFreePort,
  pidKill,
  killByPort,
};
