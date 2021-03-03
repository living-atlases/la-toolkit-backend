/* var kill  = require('tree-kill'); */
const spawn = require('child_process').spawn;

let preCmd = `${sails.config.preCmd} `;

// some code to identify when you want to kill the process. Could be
// a button on the client-side??
/* button.on('someEvent', function(){
 *   // where the killing happens
 *   kill(child.pid);
 * }); */

module.exports = {
  friendlyName: 'Term',
  description: 'Term spawn',

  inputs: {},

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs, exits) {
    var scriptArgs = [
      '-t',
      'fontSize=16',
      '-t',
      'disableLeaveAlert=true',
      '-t',
      'disableReconnect=true',
      '-p',
      '2011',
      'bash',
    ];

    var cmd = `${preCmd}ttyd`.split(' ');

    scriptArgs = cmd.concat(scriptArgs);

    var ttyd = spawn(scriptArgs.shift(), scriptArgs);
    sails.ttyPid = ttyd.pid;

    ttyd.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    ttyd.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    ttyd.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
      sails.ttyPid = null;
    });

    return exits.success();
  },
};
