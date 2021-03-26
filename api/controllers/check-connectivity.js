const cp = require('child_process');
const { defExecTimeout } = require('../libs/utils.js');
var pingTest = (server) => {
  let err;

  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  if (server.gateways.length > 0) {
    preCmd = `${preCmd}ssh ${server.gateways[0]} `;
  }
  try {
    let cmd = `${preCmd}ping -w 5 -c 1 ${server.ip}`;
    // console.log(cmd);
    cp.execSync(cmd, {
      cwd: sails.config.sshDir,
      stderr: err,
    });
    return '';
  } catch (err) {
    // console.log(err);
    return err;
  }
  // console.log(out.toString());
};

var sshTest = (server) => {
  let err;
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    cp.execSync(`${preCmd}ssh ${server.name} hostname`, {
      cwd: sails.config.sshDir,
      timeout: defExecTimeout,
      stderr: err,
    });
    return '';
  } catch (err) {
    //console.log(err);
    return err;
  }
  // console.log(out.toString());
};

var sudoTest = (server) => {
  let err;
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    cp.execSync(`${preCmd}ssh ${server.name} sudo hostname`, {
      cwd: sails.config.sshDir,
      timeout: defExecTimeout,
      stderr: err,
    });
    return '';
  } catch (err) {
    return err;
  }
  // console.log(out.toString());
};

var osVersionTest = (server) => {
  let err;
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    let out = cp.execSync(
      `${preCmd}ssh ${server.name} sudo cat /etc/os-release | egrep "^NAME=|^VERSION_ID=" | sed 's/=/:/' | sed 's/^NAME:/{"name":/' | sed 's/VERSION_ID:/"version":/' |  sed '1 s/$/,/' | sed '$ s/$/}/'`,
      {
        cwd: sails.config.sshDir,
        timeout: defExecTimeout,
        stderr: err,
      }
    );
    return out;
  } catch (err) {
    return err;
  }
  // console.log(out.toString());
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
    inputs.servers.forEach((server) => {
      resultJson[server.name] = {};

      let pingOut = pingTest(server);
      let ping = pingOut.length === 0 ? true : false;
      resultJson[server.name]['ping'] = ping;
      resultJson[server.name]['out'] = pingOut;

      let sshOut = sshTest(server);
      resultJson[server.name]['out'] =
        resultJson[server.name]['out'] + '\n' + sshOut;
      let ssh = sshOut.length === 0 ? true : false;
      resultJson[server.name]['ssh'] = ssh;

      let sudoOut = sudoTest(server);
      let sudo = sudoOut.length === 0 ? true : false;
      resultJson[server.name]['sudo'] = sudo;
      resultJson[server.name]['out'] =
        resultJson[server.name]['out'] + '\n' + sudoOut;

      let osVersionOut = osVersionTest(server);
      let osVersion =
        osVersionOut.length !== 0
          ? JSON.parse(osVersionOut)
          : { os: { name: '', version: '' } };
      resultJson[server.name]['os'] = osVersion;
    });
    // console.log(resultJson);
    return this.res.json(resultJson);
  },
};
