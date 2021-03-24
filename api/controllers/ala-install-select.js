const cp = require('child_process');

var alaInstallSelect = (version) => {
  let err;
  let preCmd = sails.config.preCmd;
  let alaInstallLocation = '/home/ubuntu/ansible/ala-install';

  try {
    if (preCmd !== '') {
      preCmd = preCmd.replace('exec', `exec -w ${alaInstallLocation}`);
      preCmd = preCmd + ' ';
    }
    if (version !== 'upstream' && version !== 'custom') {
      cp.execSync(`${preCmd}git checkout tags/${version}`, {
        cwd: alaInstallLocation,
        stderr: err,
      });
    } else if (version === 'upstream') {
      cp.execSync(`${preCmd}git fetch origin master`, {
        cwd: alaInstallLocation,
        stderr: err,
      });
      cp.execSync(`${preCmd}git pull --rebase origin master`, {
        cwd: alaInstallLocation,
        stderr: err,
      });
    }
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
