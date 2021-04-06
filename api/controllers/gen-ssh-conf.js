const yaml = require('write-yaml');

const dest = sails.config.sshDir;
const destIncDir = sails.config.asshDir;

const basicAsshConf = () => {
  // We create a object with the assh configuration format
  // https://github.com/moul/assh#
  // in order to use later 'write-yaml'
  let t = {};
  t.includes = [`/home/ubuntu/.ssh/assh.d/*.yml`];

  // This is done in ansible.cfg better
  t.defaults = {};
  if (process.env.NODE_ENV !== 'production') {
    t.defaults.StrictHostKeyChecking = 'no';
  }
  t.defaults.ControlMaster = 'auto';
  t.defaults.ControlPath = '/home/ubuntu/.ssh/%h-%p-%r.sock';
  t.defaults.ControlPersist = 'yes';
  return t;
};

const trans = (serverObjs, user) => {
  // We convert to object with the assh configuration format
  // https://github.com/moul/assh#
  // in order to use later 'write-yaml'.
  // this are created per project and later included in the main assh.yaml conf
  let t = {};
  t.hosts = {};
  serverObjs.forEach((serverObj) => {
    t.hosts[`${serverObj.name}`] = {};
    t.hosts[`${serverObj.name}`].Hostname = serverObj.ip;
    if (serverObj.gateways.length > 0) {
      t.hosts[`${serverObj.name}`].Gateways = serverObj.gateways;
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
  });
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
    uuid: {
      type: 'json',
      description: 'project uuid',
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
    var serversTransformed = trans(inputs.servers, inputs.user);
    yaml(
      `${destIncDir}assh-${inputs.name}-${inputs.uuid}.yml`,
      serversTransformed,
      (err) => {
        if (err) {
          throw new Error(err);
        }
      }
    );
    yaml(`${dest}assh.yml`, basicAsshConf(), (err) => {
      if (err) {
        throw new Error(err);
      }
    });
    // assh config build > ~/.ssh/config
    return exits.success();
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
