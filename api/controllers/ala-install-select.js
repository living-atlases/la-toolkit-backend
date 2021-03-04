const cp = require('child_process');

var alaInstallSelect = (version) => {
  let err;
  let preCmd = sails.config.preCmd;

  try {
    if (preCmd !== '') {
      preCmd = preCmd.replace(
        'exec',
        'exec -w /home/ubuntu/ansible/ala-install'
      );
      preCmd = preCmd + ' ';
    }
    cp.execSync(`${preCmd}git checkout tags/${version}`, {
      cwd: sails.config.projectDir,
      stderr: err,
    });
    return '';
  } catch (err) {
    console.log(err);
    return err;
  }
  // console.log(out.toString());
};

module.exports = {
  friendlyName: 'ala-install select',

  description: '',

  inputs: {
    version: {
      type: 'string',
      description: 'the ala-install version',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    gitError: {
      description: 'Error selecting git tags.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs, exits) {
    let out = alaInstallSelect(inputs.version);
    if (out === '') {
      return exits.success();
    } else {
      throw 'gitError';
    }
  },
};
