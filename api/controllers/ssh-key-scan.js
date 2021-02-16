const cp = require('child_process');
const fs = require('fs');

var sshKeyScan = () => {
  let err;
  let out = cp.execSync(
    `for i in ${sails.config.sshDir}/*pub ; do N=$(basename $i .pub); echo -n "$Nł"; grep -q ENCRYPTED ${sails.config.sshDir}/$N; if [[ $? -eq 0 ]]; then echo -n "1ł"; else echo -n "0ł"; fi; ssh-keygen -l -f ${sails.config.sshDir}/$N | sed 's/ /ł/1' | sed 's/ /ł/1' ; done;`,
    { shell: '/bin/bash', cwd: sails.config.sshDir, stderr: err }
  );
  if (err) {
    console.log(err);
    throw err;
  }
  // console.log(out.toString());
  return out.toString();
};

module.exports = {
  friendlyName: 'Ssh key scan',

  description: '',

  inputs: {},
  exits: {},

  fn: async function () {
    let result = await sshKeyScan();
    let keyRows = result.split(/\r?\n/);
    if (keyRows.length > 0) {
      var keys = [];
      keyRows.forEach((key) => {
        if (key.length > 0) {
          // As comments can have spaces we should divide the comments and the last type field with the separator
          var n = key.lastIndexOf(' ');
          key = key.slice(0, n) + key.slice(n).replace(' ', 'ł');
          var kS = key.split('ł');
          var k = {
            name: `${kS[0]}`,
            encrypted: parseInt(kS[1]) === 1 ? true : false,
            size: parseInt(kS[2]),
            publicKey: fs
              .readFileSync(`${sails.config.sshDir}${kS[0]}.pub`, 'utf8')
              .replace('\n', ''),
            fingerprint: `${kS[3]}`,
            desc: `${kS[4]}`,
            missing: false,
            type: `${kS[5].replace('(', '').replace(')', '')}`,
          };
          keys.push(k);
        }
      });
      var resultJson = { keys: keys };
      // console.log(resultJson);
      return this.res.json(resultJson);
    }
    return this.res.json(JSON.parse('{ "keys": [] }'));
  },
};
