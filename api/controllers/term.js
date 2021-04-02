const { ttyd } = require('../libs/utils.js');
const { appConf } = require('../libs/utils.js');
const fs = require('fs');

module.exports = {
  friendlyName: 'Term',
  description: 'Term spawn',

  inputs: {
    uuid: {
      type: 'string',
      desc: 'project uuid',
      required: false,
    },
    server: {
      type: 'string',
      desc: 'Server name',
      required: false,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    termError: {
      description: 'term error.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs, exits) {
    // console.log('Executing bash');
    try {
      if (inputs.uuid) {
        // Double check that this server belongs to this project
        var projects = JSON.parse(fs.readFileSync(appConf(), 'utf8'))[
          'projects'
        ];
        let found = false;
        projects.forEach((project) => {
          if (project['uuid'] === inputs.uuid && found === false) {
            project['servers'].forEach((serverObj) => {
              if (serverObj['name'] === inputs.server && found === false) {
                found = true;
              }
            });
          }
        });
        if (found) {
          await ttyd(`ssh ${inputs.server}`);
        } else {
          throw 'termError';
        }
      } else {
        await ttyd('bash');
      }
      return exits.success();
    } catch (e) {
      console.log(`ttyd bash call failed (${e})`);
      throw 'termError';
    }
  },
};
