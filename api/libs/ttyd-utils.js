const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;
const fs = require('fs');
const PortPool = require('./port-pool.js');
const sails = require('sails');
const kill = require('tree-kill');
const {delay, exitCodeFile, logsProdDevLocation, logErr} = require('./utils.js');
const findPidFromPort = require("find-pid-from-port")
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
    const scriptArgs = `ttyd -t scrollback=50000 -t fontSize=14 -t disableReconnect=false -t disableLeaveAlert=true --check-origin -p ${port} ${extraArgs}/usr/local/bin/echo-bash ${cmd}`;

    const ttydCmd = `${preCmd}${scriptArgs}`.split(' ');

    console.log(`cmd: ${ttydCmd.join(' ')}`);

    if (ttydCmd.indexOf('  ') !== -1) {
      console.warn(
        'WARNING: The cmd has some double space. This will make the spawn fail'
      );
    }
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

module.exports = {
  ttyd,
  ttyFreePort,
  pidKill,
  killByPort,
};
