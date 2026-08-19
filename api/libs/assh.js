const cp = require('child_process');
const util = require('util');
const {logErr} = require('./utils.js');

// exec (not execFile) on purpose: the command needs shell features (the `>`
// redirection and the docker-exec preCmd prefix) and is a fixed string with no
// user-controlled input (preCmd/sshDir come from sails config, set at boot).
const execAsync = util.promisify(cp.exec);
// SSH commands through gateways can take longer
const defExecTimeout = 20000;

// Rebuild ~/.ssh/config from the assh YAMLs. Without this file the assh
// ProxyCommand never engages: ttyd runs plain `ssh <host>`, the name resolves
// against the container's own /etc/hosts (127.0.1.1) and every terminal dies
// with EIO (gh-7). Must run after any assh config change, not only on
// connectivity checks.
//
// `exec` and `config` are injectable for tests; they default to the real
// child_process exec and the live sails config.
const asshReConfig = async ({exec = execAsync, config = undefined} = {}) => {
  const conf = config || sails.config;
  let preCmd = conf.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    const cmd = `${preCmd}bash -c "/usr/local/bin/assh config build > /home/ubuntu/.ssh/config"`;
    console.log(`assh-reconfig: ${cmd}`);
    await exec(cmd, {
      cwd: conf.sshDir,
      shell: '/bin/bash',
      timeout: defExecTimeout,
    });
    return '';
  } catch (err) {
    logErr(err);
    return err.message || err.toString();
  }
};

module.exports = {asshReConfig};
