const cp = require('child_process');
const fs = require('fs');
const path = require("path");
const {defExecTimeout} = require('../libs/utils.js');

const sshKeyScan = () => {
  let sailsConfigSshDir = sails.config.sshDir;
  let out = cp.execSync(
    `for i in $(ls ${sailsConfigSshDir}*pub) ; do N=$(basename $i .pub); NP=$(ls -1 $N* | grep -v 'pub$' | head -1); echo -n $NP"ł"; grep -q ENCRYPTED ${sailsConfigSshDir}/$NP; if [[ $? -eq 0 ]]; then echo -n "1ł"; else echo -n "0ł"; fi; ssh-keygen -l -f ${sailsConfigSshDir}/$N.pub | sed 's/ /ł/1' | sed 's/ /ł/1' ; done;`,
    {
      shell: '/bin/bash',
      cwd: sails.config.sshDir,
      timeout: defExecTimeout,
    }
  );
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
      let keys = [];
      keyRows.forEach((key) => {
        if (key.length > 0) {
          // As comments can have spaces we should divide the comments and the last type field with the separator
          let n = key.lastIndexOf(' ');
          key = key.slice(0, n) + key.slice(n).replace(' ', 'ł');
          let kS = key.split('ł');
          let privExt = path.extname(`${sails.config.sshDir}${kS[0]}`);
          let privExtBaseName = path.basename(`${sails.config.sshDir}${kS[0]}`, privExt);
          let k = {
            name: `${kS[0]}`,
            encrypted: parseInt(kS[1]) === 1,
            size: parseInt(kS[2]),
            publicKey: fs
              .readFileSync(`${sails.config.sshDir}${privExtBaseName}.pub`, 'utf8')
              .replace('\n', ''),
            fingerprint: `${kS[3]}`,
            desc: `${kS[4]}`,
            missing: false,
            type: `${kS[5].replace('(', '').replace(')', '')}`,
          };
          keys.push(k);
        }
      });
      let resultJson = {keys: keys};
      // console.log(resultJson);
      return this.res.json(resultJson);
    }
    return this.res.json(JSON.parse('{ "keys": [] }'));
  },
};
