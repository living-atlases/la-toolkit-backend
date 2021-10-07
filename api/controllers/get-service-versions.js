const extract = require('meta-extractor');
// const cp = require('child_process');
// const {defExecTimeout} = require('../libs/utils.js');
const bent = require('bent');
const request = bent('string');

const biocacheService = 'biocache_service';

const serviceNotToCheckMeta = [
  biocacheService,
  "branding",
  "solr",
  "geoserver",
  "cas_management"
];

/* const sshVersionCheck = (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }
  let cmd = `${preCmd}ssh -T ${server} command`;
  console.log(cmd);
  cp.execSync(cmd, {
    cwd: sails.config.sshDir,
    shell: "/bin/bash",
    timeout: defExecTimeout,
  });
  return '';
}
*/
module.exports = {


  friendlyName: 'Get service versions',


  description: '',

  inputs: {
    services: {
      type: 'json',
      description: 'A LA urls list to verify software versions running',
      required: true,
      custom: function (value) {
        return _.isObject(value);
      },
    },
  },

  exits: {},


  fn: async function (inputs) {
    // console.log(inputs.urls);
    // We create a object with undefined versions
    // console.log(inputs.services);
    let versions = Object.keys(inputs.services).reduce((a, v) => ({...a, [v]: undefined}), {});
    let serviceNames = Object.keys(inputs.services);
    // Lets check the running versions with different approaches
    await Promise.all(
      serviceNames.map(async (name) => {
        if (!serviceNotToCheckMeta.includes(name)) {
          let res;
          try {
            res = await extract({uri: inputs.services[name]['url'], rxMeta: /^app\.version$/});
          } catch (e) {
            //
            // console.log(e);
          }
          if (res != null && res['app.version'] != null) {
            versions[name] = res['app.version'];
          } else {
            try {
              res = await extract({
                uri: inputs.services[name]['url'] + '/buildInfo',
                rxMeta: /^app\.version$/
              });
            } catch (e) {
              // console.log(e);
            }
            if (res != null && res['app.version'] != null) {
              versions[name] = res['app.version'];
            }
          }
        }
      })
    );
    try {
      // Check biocache version while meta is not available
      const biocacheHtml = await request(inputs.services[biocacheService].url + '/buildInfo');
      const biocacheVersionMatch = biocacheHtml.match(/.*<td>App version<\/td><td>(.*?)<\/td>.*/);
      versions[biocacheService] = biocacheVersionMatch[1];
    } catch (e) {
      // console.log();
    }
    console.log(versions);
    // Other option:
    // https://nexus.ala.org.au/service/local/lucene/search?sha1=7882074010dc22e27d25e3ad172beae97d83584d
    return this.res.json(versions);
  }
};
