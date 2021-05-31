const fs = require('fs');
const genName = (name) => `${sails.config.sshDir}${name}`;

module.exports = {
  friendlyName: 'ssh pair key import',

  description: '',

  inputs: {
    name: {
      type: 'string',
      example: 'some-key-name',
      description: 'the name of the key',
      required: true,
    },
    publicKey: {
      type: 'string',
      description: 'the public ssh key',
      required: true,
    },
    privateKey: {
      type: 'string',
      description: 'the private ssh key',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs, exits) {
    fs.writeFileSync(`${genName(inputs.name)}.pub`, inputs.publicKey, {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.writeFileSync(`${genName(inputs.name)}`, inputs.privateKey, {
      encoding: 'utf8',
      mode: 0o600,
    });
    return exits.success();
  },
};
