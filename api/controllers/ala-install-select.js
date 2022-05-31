const cp = require('child_process');
const {logErr} = require('../libs/utils.js');

const alaInstallSelect = (version) => {
  let preCmd = sails.config.preCmd;
  let alaInstallLocation =
    process.env.NODE_ENV === 'production'
      ? '/home/ubuntu/ansible/ala-install'
      : sails.config.projectDir;
  console.log(`Resulting cwd: ${alaInstallLocation}`);
  try {
    if (preCmd !== '') {
      preCmd = preCmd.replace(
        'exec',
        `exec -w /home/ubuntu/ansible/ala-install`
      );
      preCmd = preCmd + ' ';
    }
    console.log('Selecting proper ala-install version');
    if (version !== 'custom') {
      // Stash previous uncommited changes
      cp.execSync(`${preCmd}git stash`, {
        cwd: alaInstallLocation,
      });
      cp.execSync(`${preCmd}git fetch --tags origin master`, {
        cwd: alaInstallLocation,
      });
    }
    if (version !== 'upstream' && version !== 'custom') {
      cp.execSync(`${preCmd}git checkout tags/${version}`, {
        cwd: alaInstallLocation,
      });
    } else if (version === 'upstream') {
      cp.execSync(`${preCmd}git pull --rebase origin master`, {
        cwd: alaInstallLocation,
      });
    }
    console.log('End of ala-install git pull');
    return '';
  } catch (err) {
    logErr(err);
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
