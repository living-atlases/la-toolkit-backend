const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;
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
      let cmd = `for i in $(docker container top la-toolkit | grep "\\-p ${port}" | awk '{print $2}'); do kill $i; done`;
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
// Note: with a non-empty preCmd (docker-exec setups) the returned pid is the
// host-side `docker exec` client; killing it does not stop the in-container
// process (moby#9098). The target deployment runs echo-bash directly (empty
// preCmd), so cancel works there.
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

// Cancel a running detached deploy by reading its pidfile and killing the
// process tree. Returns true if a pid was found and a kill was attempted.
const killDeploy = async (logsPrefix, logsSuffix) => {
  try {
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
    if (Number.isNaN(pid)) {
      return false;
    }
    await pidKill(pid);
    return true;
  } catch (error) {
    logErr(error);
    return false;
  }
};

module.exports = {
  ttyd,
  spawnDetached,
  killDeploy,
  ttyFreePort,
  pidKill,
  killByPort,
};
