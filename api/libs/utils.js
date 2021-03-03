const spawn = require('child_process').spawn;
const kill = require('tree-kill');
const pkill = require('pkill');

let preCmd = `${sails.config.preCmd} `;

module.exports.projectShortname = (name, uuid) => {
  let shortName = name
    .toLowerCase()
    .replace(/[^\d.-\w]/g, '')
    .replace(/\./g, '-');
  return shortName.length === 0 ? `la-${uuid}` : shortName;
};

const ttydKill = () => {
  if (typeof sails.ttydPid !== 'undefined' && sails.ttydPid !== null) {
    kill(sails.ttydPid);
  }
  // anyway pkill
  pkill('ttyd');
};

module.exports.ttydKill = ttydKill;

module.exports.ttyd = (
  cmd,
  once = false,
  cwd = '/home/ubuntu',
  env = process.env
) => {
  ttydKill();
  if (preCmd !== '') {
    preCmd = preCmd.replace('exec', `exec -w ${cwd}`);
    cwd = null;
  }
  var extraArgs = `${once ? '--once ' : ''}`;
  var scriptArgs = `ttyd -t fontSize=14 -t disableLeaveAlert=true -t disableReconnect=true -p 2011 ${extraArgs}${cmd}`;

  var ttydCmd = `${preCmd}${scriptArgs}`.split(' ');
  var echoTtydCmd = `${preCmd}echo ${scriptArgs}`.split(' ');
  console.log(`cwd: ${cwd}`);
  console.log(`cmd: ${ttydCmd.join(' ')}`);
  spawn(echoTtydCmd.shift(), echoTtydCmd, {
    cwd: cwd,
    env: env,
  });
  var ttyd = spawn(ttydCmd.shift(), ttydCmd, { cwd: cwd, env: env });
  sails.ttydPid = ttyd.pid;

  ttyd.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  ttyd.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  ttyd.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    sails.ttydPid = null;
  });
};
