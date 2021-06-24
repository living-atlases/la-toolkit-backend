const cp = require('child_process');
const {logErr} = require('../libs/utils.js');

let defExecTimeout = 5000;

const log = (preCmd, cmd) => {
  console.log(`test-connectivity:\npreCmd: ${preCmd}\ncmd: ${cmd}`);
};

const asshReConfig = () => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    let cmd = `${preCmd}bash -c "/home/ubuntu/go/bin/assh config build > /home/ubuntu/.ssh/config"`;
    log(preCmd, cmd);
    cp.execSync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });
    return '';
  } catch (err) {
    logErr(err);
    return err;
  }
};

const pingTest = async (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  if (server.gateways.length > 0) {
    let gw = await Server.findOne({id: server.gateways[0], projectId: server.projectId})
    if (!gw) {
      throw Error(`Wrong gw: ${server.gateways[0]}`);
    }
    preCmd = `${preCmd}ssh -T ${gw.name} `;
  }
  try {
    let cmd = `${preCmd}ping -w 5 -c 1 ${server.ip}`;
    log(preCmd, cmd);
    cp.execSync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });
    return '';
  } catch (err) {
    logErr(err);
    return err;
  }
};

const sshTest = (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  function sshTestAsUser() {
    let cmd = `${preCmd}ssh -T ${server.name} hostname`;
    log(preCmd, cmd);
    cp.execSync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });
    return '';
  }

  try {
    return sshTestAsUser();
  } catch (err) {
    console.warn('Failed to ssh connect using configured ssh default user, retrying...');
    logErr(err);
  }

  try {
    return sshTestAsUser();
  } catch (err) {
    console.warn('Failed to ssh connect using configured ssh default user, trying root');
    logErr(err);
  }

  try {
    let cmd = `${preCmd}ssh -T root@${server.name} hostname`;
    log(preCmd, cmd);
    cp.execSync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });
    return '';
  } catch (err) {
    logErr(err);
    return err;
  }
};

const sudoTest = (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    let cmd = `${preCmd}ssh -T ${server.name} sudo hostname`;
    log(preCmd, cmd);
    cp.execSync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });
    return '';
  } catch (err) {
    logErr(err);
    return err;
  }
};

const osVersionTest = (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    let cmd = `${preCmd}ssh -T ${server.name} sudo cat /etc/os-release | egrep "^NAME=|^VERSION_ID=" | sed 's/=/:/' | sed 's/^NAME:/{"name":/' | sed 's/VERSION_ID:/"version":/' |  sed '1 s/$/,/' | sed '$ s/$/}/'`;
    log(preCmd, cmd);
    return cp.execSync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });
  } catch (err) {
    logErr(err);
    return err;
  }
};

module.exports = {
  friendlyName: 'Check connectivity',

  description: '',

  inputs: {
    servers: {
      type: 'json',
      description: 'A servers list to test connectivity',
      required: true,
      custom: function (value) {
        return _.isObject(value);
      },
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    let resultJson = {};
    let updatedServers = [];

    asshReConfig();

    for (const server of inputs.servers) {
      resultJson[server.name] = {};

      let pingOut = await pingTest(server);
      resultJson[server.name]['ping'] = pingOut.length === 0;
      resultJson[server.name]['out'] = pingOut;

      let sshOut = sshTest(server);
      resultJson[server.name]['out'] =
        resultJson[server.name]['out'] + '\n' + sshOut;
      resultJson[server.name]['ssh'] = sshOut.length === 0;

      let sudoOut = sudoTest(server);
      resultJson[server.name]['sudo'] = sudoOut.length === 0;
      resultJson[server.name]['out'] =
        resultJson[server.name]['out'] + '\n' + sudoOut;

      let osVersionOut = osVersionTest(server);
      resultJson[server.name]['os'] = osVersionOut.length !== 0
        ? JSON.parse(osVersionOut)
        : {os: {name: '', version: ''}};

      let updatedServer = await Server.updateOne({id: server.id}).set(
        {
          reachable: resultJson[server.name]['ping'] ? 'success' : 'failed',
          sshReachable: resultJson[server.name]['ssh'] ? 'success' : 'failed',
          sudoEnabled: resultJson[server.name]['sudo'] ? 'success' : 'failed',
          osName: resultJson[server.name]['os'].name,
          osVersion: resultJson[server.name]['os'].version,
        });
      updatedServers.push(updatedServer);
    }
    resultJson.servers = updatedServers;
    return this.res.json(resultJson);
  }
};
