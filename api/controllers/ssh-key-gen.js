const cp = require('child_process');
const fs = require('fs');
const { defExecTimeout } = require('../libs/utils.js');

const genName = (name) => `${sails.config.sshDir}${name}`;

const sshKeyGen = (name) => {
  let out = cp.execSync(
    `ssh-keygen -q -t rsa -b 2048 -f ${genName(
      name
    )} -N "" -C "Generated-by-la-toolkit"`,
    { cwd: sails.config.sshDir, timeout: defExecTimeout }
  );
  console.log(out.toString());
  return out.toString();
};

module.exports = {
  friendlyName: 'Ssh key gen',

  description: '',

  inputs: {
    name: {
      type: 'string',
      example: 'some-key-name',
      description: 'the name of the key',
      required: true,
    },
  },
  exits: {
    success: {
      description: 'All done.',
    },
    keyExists: {
      description: 'A key with this name, already exists',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs, exits) {
    // All done.
    if (fs.existsSync(genName(inputs.name))) {
      throw Error('keyExits');
    }
    await sshKeyGen(inputs.name);
    return exits.success();
  },
};
