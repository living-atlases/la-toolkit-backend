const cp = require('child_process');
const { defExecTimeout, logErr } = require('../libs/utils.js');

const generatorSelect = (version) => {
  let preCmd = sails.config.preCmd;

  try {
    if (preCmd !== '') {
      preCmd = preCmd.replace('exec', 'exec -w /home/ubuntu/');
      preCmd = preCmd + ' ';
    }
    console.log("Downloading proper 'generator-living-atlas' version and deps");
    let currentVersion = cp.execSync(
      `${preCmd}npm list --depth=0 --global  generator-living-atlas| grep -o "@.*"  | sed 's/@//' | tr '\n' ' '  `,
      {
        cwd: sails.config.projectDir,
        timeout: defExecTimeout,
      }
    );
    if (currentVersion.toString().trim() !== version) {
      cp.execSync(`${preCmd}npm install -g generator-living-atlas@${version}`, {
        cwd: sails.config.projectDir,
        timeout: 240000,
      });
    }
    console.log("End of downloading 'generator-living-atlas'");
    return '';
  } catch (err) {
    logErr(err);
    return err;
  }
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
