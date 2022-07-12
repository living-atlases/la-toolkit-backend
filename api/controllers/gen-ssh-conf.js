const yaml = require('write-yaml-file')
const cp = require('child_process');
const {logErr} = require('../libs/utils.js');
const dest = sails.config.sshDir;
const destIncDir = sails.config.asshDir;
const fs = require('fs');

const basicAsshConf = () => {
  // We create a object with the assh configuration format
  // https://github.com/moul/assh#
  // in order to use later 'write-yaml'
  let t = {};
  t.includes = [`/home/ubuntu/.ssh/assh.d/*.yml`];

  t.defaults = {};
  if (process.env.NODE_ENV !== 'production') {
    t.defaults.StrictHostKeyChecking = 'no';
  } else {
    t.defaults.StrictHostKeyChecking = 'accept-new';
  }
  t.defaults.ControlMaster = 'auto';
  t.defaults.ControlPath = '/home/ubuntu/.ssh/%h-%p-%r.sock';
  t.defaults.ControlPersist = '90m';
  // t.defaults.ControlMasterMkdir = true;
  return t;
};

const trans = async (serverObjs, user, projectId) => {
  // We convert to object with the assh configuration format
  // https://github.com/moul/assh#
  // in order to use later 'write-yaml'.
  // this are created per project and later included in the main assh.yaml conf
  let t = {};
  t.hosts = {};
  for (const serverObj of serverObjs) {
    t.hosts[`${serverObj.name}`] = {};
    t.hosts[`${serverObj.name}`].Hostname = serverObj.ip;
    if (serverObj.gateways.length > 0) {
      let gwNames = [];
      for await (let gwId of serverObj.gateways) {
        let gw = await Server.findOne({id: gwId, projectId: projectId});
        if (gw) {
          gwNames.push(gw.name);
        }
      }
      t.hosts[`${serverObj.name}`].Gateways = gwNames;
    }
    if (serverObj.aliases.length > 0) {
      t.hosts[`${serverObj.name}`].Aliases = serverObj.aliases;
    }
    if (serverObj.sshPort !== 22) {
      t.hosts[`${serverObj.name}`].Port = serverObj.sshPort;
    }
    if (serverObj.sshUser !== null) {
      t.hosts[`${serverObj.name}`].User = serverObj.sshUser;
    } else {
      t.hosts[`${serverObj.name}`].User = user;
    }
    if (serverObj.sshKey !== null) {
      t.hosts[
        `${serverObj.name}`
        ].IdentityFile = `/home/ubuntu/.ssh/${serverObj.sshKey.name}`;
    }
  }
  return t;
};

module.exports = {
  friendlyName: 'assh gen',

  description: '',

  inputs: {
    servers: {
      type: 'json',
      description: 'A servers list',
      required: true,
      custom: function (value) {
        return _.isObject(value);
        // &&
        //        _.isBoolean(value.name) &&
        //      _.isBoolean(value.age)
      },
    },
    user: {
      type: 'json',
      description: 'ansible ssh user',
      required: true,
    },
    id: {
      type: 'string',
      description: 'project id',
      required: true,
    },
    name: {
      type: 'json',
      description: 'project name',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs, exits) {
    // Create .ssh/assh.d if not present
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    let serversTransformed = await trans(inputs.servers, inputs.user, inputs.id);
    // options from dump: https://www.npmjs.com/package/js-yaml
    let dirNames = await Project.find({select: ['dirName']});
    let p = await Project.findOne({id: inputs.id});
    if (dirNames.length > 0) {
      // Remove old project assh configurations
      let notThis = dirNames.map(function (d) {
        return '! -name "assh-' + d.dirName + '.yml" ';
      })
      let cmd = `find ${destIncDir} ${notThis.join('')} -name 'assh*yml' -delete`
      let preCmd = sails.config.preCmd;
      if (preCmd !== '') {
        preCmd = preCmd + ' ';
      }
      try {
        cp.execSync(cmd, {});
      } catch (err) {
        logErr(err);
      }
    }
    let yamlOpts = {indent: 2};
    try {
      await yaml(
        // to use the id is too much
        // `${destIncDir}assh-${inputs.name}-${inputs.id}.yml`,
        `${destIncDir}assh-${p.dirName}.yml`,
        serversTransformed, yamlOpts);
      await yaml(`${dest}assh.yml`, basicAsshConf(), yamlOpts);
      // assh config build > ~/.ssh/config
      return exits.success();
    } catch (err) {
      throw new Error(err);
    }
  },
};

/* Dart object:
[ { name: 'vm1',
    ip: '10.0.0.1',
    sshPort: 22,
    sshUser: null,
    aliases: [],
    sshPrivateKey: null,
    gateways: [ 'vm2' ],
    reachable: 'unknown',
    sshReachable: 'unknown',
    sudoEnabled: 'unknown' },
*/

/* assh.yml
hosts:
  hosta:
    Hostname: 1.2.3.4

  hostb:
    Hostname: 5.6.7.8
    Gateways: hosta

  hostc:
    Hostname: 9.10.11.12
    Gateways: hostb

  hostd:
    Hostname: 13.14.15.16
    GatewayConnectTimeout: 2
    Gateways:
    - direct
    - hosta
*/
