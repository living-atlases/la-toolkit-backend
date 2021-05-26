const {ttyd, ttyFreePort} = require('../libs/ttyd-utils.js');
// noinspection JSUnresolvedFunction
module.exports = {
  friendlyName: 'Term',
  description: 'Term spawn',

  inputs: {
    id: {
      type: 'string',
      desc: 'project id',
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

  fn: async function (inputs) {
    if (inputs.id) {
      console.log('Executing ssh');
    } else {
      console.log('Executing bash');
    }
    let ttydPid;
    try {
      let port = await ttyFreePort();
      let cmd;
      if (inputs.id) {
        // Double check that this server belongs to this project
        let found = false;
        let project = await Project.findOne({id: inputs.id}).populate(
          'servers'
        );
        if (project) {
          project.servers.forEach((serverObj) => {
            if (serverObj['name'] === inputs.server && found === false) {
              found = true;
            }
          });
        }

        if (found) {
          cmd = `ssh ${inputs.server}`;
          ttydPid = await ttyd(cmd, port, false);
        } else {
          throw 'termError';
        }
      } else {
        cmd = 'bash';
        ttydPid = await ttyd(cmd, port, false);
      }
      this.res.json({cmd: cmd, port: port, ttydPid: ttydPid});
    } catch (e) {
      console.log(`ttyd bash call failed (${e})`);
      throw 'termError';
    }
  },
};
