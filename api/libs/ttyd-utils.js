const spawn = require('child_process').spawn;
const fs = require('fs');
const PortPool = require('./port-pool.js');
const sails = require('sails');
const kill = require('tree-kill');
const { delay } = require('./utils.js');

const portPool = new PortPool(
  sails.config.ttydMinPort,
  sails.config.ttydMaxPort
);
const ttyFreePort = () => portPool.getNext();

const ttydPkill = async () => {
  return new Promise((resolve) => {
    pkill.full('ttyd', (pkerr, validPid) => {
      if (pkerr) {
        console.log(err);
        resolve('termError');
      }
      if (validPid) {
        console.log(`Pkilling ttyd with pid ${validPid}`);
      }
      resolve();
    });
  });
};

const pidKill = async (pid) => {
  return new Promise((resolve) => {
    if (typeof pid === 'number') {
      console.log(`Killing proc with pid ${pid}`);
      kill(pid, 'SIGKILL', (kerr) => {
        if (kerr) {
          console.log(err);
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

const ttydKill = async () => {
  return pidKill(sails.ttydPid);
};

const ttyd = async (
  cmd,
  port,
  once = true,
  cwd = '/home/ubuntu',
  env = {},
  logsPrefix,
  logsSuffix
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
        for (var [key, value] of Object.entries(env)) {
          envDocker = envDocker + ` --env ${key}=${value}`;
        }
        preCmd = preCmd.replace('exec', `exec ${envDocker.trim()}`);
      }

      preCmd = preCmd + ' ';
      cwd = null;
    }

    console.log(`Resulting cwd: ${cwd}`);
    console.log(`Resulting preCmd: ${preCmd}`);

    var extraArgs = `${once ? '--once ' : ''}`;
    // -t disableReconnect=true
    // --max-clients 1
    var scriptArgs = `ttyd -t fontSize=14 -t disableLeaveAlert=true --check-origin -p ${port} ${extraArgs}/usr/local/bin/echo-bash ${cmd}`;

    var ttydCmd = `${preCmd}${scriptArgs}`.split(' ');

    console.log(`cmd: ${ttydCmd.join(' ')}`);

    if (ttydCmd.indexOf('  ') !== -1) {
      console.warn(
        'WARNING: The cmd has some double space. This will make the spawn fail'
      );
    }

    const ttyd = spawn(ttydCmd.shift(), ttydCmd, {
      cwd: cwd,
      env: { ...process.env, ...env, NODE_DEBUG: 'child_process' },
    });

    sails.ttydPid = ttyd.pid;
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

    ttyd.on('close', (code) => {
      console.log(`child process exited with code ${code} with ${ttyd.pid}`);
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
};
