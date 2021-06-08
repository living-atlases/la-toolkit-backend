const cp = require('child_process');
const {defExecTimeout, logErr} = require('../libs/utils.js');

const log = (preCmd, cmd) => {
  console.log(`test-connectivity:\npreCmd: ${preCmd}\ncmd: ${cmd}`);
};

const pingTest = (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  if (server.gateways.length > 0) {
    preCmd = `${preCmd}ssh ${server.gateways[0]} `;
  }
  try {
    let cmd = `${preCmd}ping -w 5 -c 1 ${server.ip}`;
    log(preCmd, cmd);
    cp.execSync(cmd, {
      cwd: sails.config.sshDir,
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

  try {
    let cmd = `${preCmd}ssh ${server.name} hostname`;
    log(preCmd, cmd);
    cp.execSync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });
    return '';
  } catch (err) {
    console.warn('Failed to ssh connect using configured ssh default user, trying root');
    logErr(err);
  }

  try {
    let cmd = `${preCmd}ssh root@${server.name} hostname`;
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
    let cmd = `${preCmd}ssh ${server.name} sudo hostname`;
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
    let cmd = `${preCmd}ssh ${server.name} sudo cat /etc/os-release | egrep "^NAME=|^VERSION_ID=" | sed 's/=/:/' | sed 's/^NAME:/{"name":/' | sed 's/VERSION_ID:/"version":/' |  sed '1 s/$/,/' | sed '$ s/$/}/'`;
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
    for (const server of inputs.servers) {
      resultJson[server.name] = {};

      let pingOut = pingTest(server);
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
          osVersion: resultJson[server.name]['os'].name,
        });
      updatedServers.push(updatedServer);
    }
    resultJson.servers = updatedServers;
    return this.res.json(resultJson);
  }
};
