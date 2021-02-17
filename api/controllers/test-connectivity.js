const cp = require('child_process');

var pingTest = (server) => {
  let err;
  let preCmd = `${sails.config.preCmd} `;

  if (server.gateways.length > 0) {
    preCmd = `${preCmd}ssh ${server.gateways[0]} `;
  }
  try {
    let cmd = `${preCmd}ping -w 5 -c 1 ${server.ip}`;
    // console.log(cmd);
    let out = cp.execSync(cmd, {
      cwd: sails.config.sshDir,
      stderr: err,
    });
    return out.toString();
  } catch (err) {
    // console.log(err);
    return false;
  }
  // console.log(out.toString());
};

var sshTest = (server) => {
  let err;
  let preCmd = `${sails.config.preCmd} `;

  try {
    let out = cp.execSync(`${preCmd}ssh ${server.name} hostname`, {
      cwd: sails.config.sshDir,
      stderr: err,
    });
    return out.toString();
  } catch (err) {
    //console.log(err);
    return false;
  }
  // console.log(out.toString());
};

var sudoTest = (server) => {
  let err;
  let preCmd = `${sails.config.preCmd} `;

  try {
    let out = cp.execSync(`${preCmd}ssh ${server.name} sudo hostname`, {
      cwd: sails.config.sshDir,
      stderr: err,
    });
    return out.toString();
  } catch (err) {
    //console.log(err);
    return false;
  }
  // console.log(out.toString());
};

module.exports = {
  friendlyName: 'Test connectivity',

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
      let ping = pingTest(server) ? true : false;
      resultJson[server.name]['ping'] = ping;
      let ssh = sshTest(server) ? true : false;
      resultJson[server.name]['ssh'] = ssh;
      let sudo = sudoTest(server) ? true : false;
      resultJson[server.name]['sudo'] = sudo;
    });
    console.log(resultJson);
    return this.res.json(resultJson);
  },
};
