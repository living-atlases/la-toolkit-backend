const cp = require('child_process');

var generatorSelect = (version) => {
  let err;
  let preCmd = sails.config.preCmd;

  try {
    if (preCmd !== '') {
      preCmd = preCmd.replace('exec', 'exec -w /home/ubuntu/');
      preCmd = preCmd + ' ';
    }
    let currentVersion = cp.execSync(
      `${preCmd}npm list --depth 1 --global  generator-living-atlas| grep -o "@.*"  | sed 's/@//' | tr '\n' ' '  `,
      {
        cwd: sails.config.projectDir,
        stderr: err,
      }
    );
    if (currentVersion.toString().trim() !== version) {
      cp.execSync(`${preCmd}npm install -g generator-living-atlas@${version}`, {
        cwd: sails.config.projectDir,
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
  friendlyName: 'generator version select',

  description: '',

  inputs: {
    version: {
      type: 'string',
      description: 'the generator version',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    gitError: {
      description: 'Error selecting npm package.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs, exits) {
    let out = generatorSelect(inputs.version);
    if (out === '') {
      return exits.success();
    } else {
      throw 'gitError';
    }
  },
};
