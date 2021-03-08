const spawn = require('child_process').spawn;
const kill = require('tree-kill');
const pkill = require('pkill');
const waitOn = require('wait-on');
const p = require('path');

module.exports.projectShortname = (name, uuid) => {
  let shortName = name
    .toLowerCase()
    .replace(/[^\d.-\w]/g, '')
    .replace(/\./g, '-');
  return shortName.length === 0 ? `la-${uuid}` : shortName;
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

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

const ttydKill = async () => {
  return new Promise(async (resolve) => {
    if (typeof sails.ttydPid === 'number') {
      console.log(`Killing ttyd with pid ${sails.ttydPid}`);
      kill(sails.ttydPid, 'SIGKILL', (kerr) => {
        if (kerr) {
          console.log(err);
          resolve('termError');
        }
        resolve();
      });
    } else {
      console.log('Not killing unknown ttyd pid');
      resolve();
    }
  });
};

module.exports.ttyd = async (
  cmd,
  once = false,
  cwd = '/home/ubuntu',
  env = process.env
) => {
  // kill any previous ttyd process
  await ttydKill();
  await ttydPkill();
  // Wait to the ttyd port is free
  var waitOnOpts = {
    resources: ['http://localhost:2011/'],
    timeout: 10000,
    // tcpTimeout: 10000,
    reverse: true,
    verbose: true,
  };
  try {
    await waitOn(waitOnOpts);
    // once here, all resources are available
    console.log(`cwd: ${cwd}`);
    console.log(`env: ${JSON.stringify(env)}`);

    let preCmd = sails.config.preCmd;
    // During devel set work dir
    if (preCmd !== '') {
      preCmd = preCmd.replace('exec', `exec -w ${cwd}`);

      let envDocker = '';
      for (var [key, value] of Object.entries(env)) {
        envDocker = envDocker + ` --env ${key}=${value}`;
      }
      preCmd = preCmd.replace('exec', `exec ${envDocker.trim()}`);
      preCmd = preCmd + ' ';
      cwd = null;
    }

    console.log(`Resulting cwd: ${cwd}`);

    var extraArgs = `${once ? '--once ' : ''}`;
    // -t disableReconnect=true
    // --max-clients 1
    var scriptArgs = `ttyd -t fontSize=14 -t disableLeaveAlert=true --check-origin -p 2011 ${extraArgs}${cmd}`;

    var ttydCmd = `${preCmd}${scriptArgs}`.split(' ');

    console.log(`cmd: ${ttydCmd.join(' ')}`);

    const ttyd = spawn(ttydCmd.shift(), ttydCmd, {
      cwd: cwd,
      env: env,
    }); /* .on('error', (err) => {
      console.log(err);
      throw Error(err);
    }); */
    console.log(`ttyd pid: ${ttyd.pid}`);
    sails.ttydPid = ttyd.pid;

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
      // sails.ttydPid = null;
    });
  } catch (werr) {
    console.log(`ttyd call failed (${werr})`);
    //throw Error(werr);
  }
  console.log('finished ttyd call');
};

const logFolder = '/home/ubuntu/ansible/logs/';
module.exports.logsFolder = logFolder;
module.exports.logsFile = (folder, suffix, colorized = false) =>
  p.join(folder, `ansible-${colorized ? 'colorized-' : ''}${suffix}.log`);
module.exports.resultsFile = (suffix) => `results-${suffix}.json`;
