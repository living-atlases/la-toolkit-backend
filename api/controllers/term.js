const { ttyd, ttyFreePort } = require('../libs/ttyd-utils.js');
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
    if (inputs.uuid) {
      console.log('Executing ssh');
    } else {
      console.log('Executing bash');
    }
    try {
      let port = await ttyFreePort();
      let cmd;
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
          cmd = `ssh ${inputs.server}`;
          await ttyd(cmd, port);
        } else {
          throw 'termError';
        }
      } else {
        cmd = 'bash';
        await ttyd(cmd, port);
      }
      this.res.json({ cmd: cmd, port: port });
    } catch (e) {
      console.log(`ttyd bash call failed (${e})`);
      throw 'termError';
    }
  },
};
