const cp = require('child_process');
const fs = require('fs').promises;
const fsn = require('fs');
const p = require('path');
const brandOrign = sails.config.baseBrandingLocation;
const { defExecTimeout } = require('../libs/utils.js');

async function yoGen(pkgName, path, yoRc) {
  return new Promise(function (resolve, /* reject */) {
    fs.open(p.join(path, '.yo-rc.json'), 'w')
      .then((desc) => {
        fs.writeFile(desc, JSON.stringify(yoRc, null, 2), { encoding: 'utf8' })
          .then(() => {
            desc.close();
            console.log(p.join(path, `${pkgName}-branding`));
            if (!fsn.existsSync(p.join(path, `${pkgName}-branding`))) {
              console.log(`Copying branding from ${brandOrign}`);
              cp.execSync(`cp -a ${brandOrign} ${pkgName}-branding`, {
                cwd: path,
                timeout: defExecTimeout,
              });
            }
            console.log('Generating inventories');
            try {
              cp.execSync('cat .yo-rc.json', { cwd: path });
            } catch (e) {
              console.log('Error cat .yo-rc.json', e);
            }
      try {
        console.log('PATH:', process.env.PATH);
        try {
           console.log('yo version check:', cp.execSync('yo --version', { encoding: 'utf8' }).trim());
        } catch (verErr) {
           console.log('WARNING: `yo` command not found or failed:', verErr.message);
        }

        cp.execSync(
          'yo living-atlas --replay-dont-ask --force',
          { cwd: path, timeout: defExecTimeout }
        );
      } catch (e) {
        console.log('Generic Error during yo generation:', e.message);
        if (e.stdout) console.log('Error output:', e.stdout.toString());
        if (e.stderr) console.log('Error stderr:', e.stderr.toString());
        console.log('Full Error Object:', e);
        throw e;
      }
            if (
              !fsn.existsSync(
                p.join(path, `${pkgName}-branding/app/js/settings.js`)
              )
            ) {
              cp.execSync(
                `cp -f ${pkgName}-branding/app/js/settings.js.sample ${pkgName}-branding/app/js/settings.js`,
                { cwd: path, timeout: defExecTimeout }
              );
            }
            console.log('End of yo');
            resolve();
          })
          .catch((/* err */) => {
            desc.close();
            resolve('genError');
          });
        // console.log("yo-rc written");
      })
      .catch((err) => {
        console.log(err);
        resolve('fsError');
      });
  });
}

module.exports = {
  friendlyName: 'yo living generator',
  description: 'Calls to yeoman living-atlas generator',

  inputs: {
    pkgName: {
      type: 'string',
      required: true,
    },
    path: {
      type: 'string',
      required: true,
    },
    yoRc: {
      type: {},
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    genError: {
      description: 'Error during yeoman generation.',
    },
    fsError: {
      description: 'Error during fs calls.',
    },
  },

  fn: async function (inputs, exits) {
    let opt = await yoGen(inputs.pkgName, inputs.path, inputs.yoRc);
    if (opt) {
      throw opt;
    } else return exits.success();
  },
};
