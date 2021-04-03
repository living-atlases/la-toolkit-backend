const cp = require('child_process');
const { defExecTimeout } = require('../libs/utils.js');

let preCmd = ''; // sails.config.preCmd;
if (preCmd !== '') {
  preCmd = preCmd + ' ';
}

module.exports = {
  friendlyName: 'Ssh cmd',

  description: 'Exec a ssh command in a server and returns the result',

  inputs: {
    server: {
      type: 'string',
      required: true,
    },
    cmd: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    let err = '';
    let out = '';
    try {
      let cmd = `${preCmd}ssh ${inputs.server} ${inputs.cmd}`;
      out = cp.execSync(cmd, {
        cwd: sails.config.sshDir,
        timeout: defExecTimeout,
        stderr: err,
      });
      let res = { code: 0, error: err, out: out.toString(), cmd: cmd };
      //console.log(res);
      return res;
    } catch (err) {
      // console.log(err);
      res = {
        code: err.status,
        wrapperError: err.toString(),
        err:
          err.output[1] != null
            ? err.output[1].toString()
            : err.output.toString(),
      };
      console.log(res);
      return res;
    }
  },
};
