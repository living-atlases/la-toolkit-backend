const bent = require('bent');
const request = bent('string');
const parser = require('fast-xml-parser');
const cp = require('child_process');
const {defExecTimeout, logErr} = require('../libs/utils.js');

const pipelinesVersions = async () => {
  let preCmd = sails.config.preCmd;

  try {
    if (preCmd !== '') {
      preCmd = preCmd.replace('exec', 'exec -w /home/ubuntu/');
      preCmd = preCmd + ' ';
    }
    cp.execSync(
      `${preCmd}sudo apt update`,
      {
        cwd: sails.config.projectDir,
        timeout: defExecTimeout,
      }
    );
    // console.log("Checking 'la-pipelines' available versions");
    let currentVersions = cp.execSync(
      `${preCmd} apt-cache madison la-pipelines  | cut -d"|" -f 1,2 | cut -d"+" -f 1 | sort | uniq  | cut -d "|" -f 2 | sed 's/^ /"/g'| sed 's/$/",/g' | paste -s - - | egrep -v "^$" | sed 's/,$/]/' | sed 's/^/[/' `,
      {
        cwd: sails.config.projectDir,
        timeout: defExecTimeout,
      }
    ).toString();
    // console.log(`versions:\n${currentVersions}`);
    let pipelinesJsonS =
      `{
         "metadata": {
           "groupId": "au.org.ala",
           "artifactId": "pipelines",
           "versioning": {
             "versions": {
                "version": ${currentVersions}
             }
           }
         }
       }`;
    return JSON.parse(pipelinesJsonS);
  } catch (err) {
    logErr(err);
    return err;
  }
}

module.exports = {
  friendlyName: 'get ala nexus artifact versions',

  description: '',

  inputs: {
    deps: {
      type: 'json',
      description: 'list of deps to get versions',
      required: true,
    },
  },

  exits: {
    getError: {
      description: 'Http error checking the nexus ALA module versions.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs) {
    let result = {};
    let depList = Object.keys(inputs.deps);
    let pVersions = await pipelinesVersions();
    await Promise.all(
      depList.map(async (service) => {
        result[service] = {};
        for (let repo of ["releases", "snapshots"]) {
          let artifacts = inputs.deps[service];
          // multiple artifacts for the same service can be specified separated by commas, like "collectory ala-collectory"
          for (let artifact of artifacts.split(' ')) {
            try {
              if (artifact === 'solr' || artifact === 'solrcloud') {
                // As solr does not provide a list of versions, we maintain this json in github :-/
                const solrData = await request('https://raw.githubusercontent.com/living-atlases/la-toolkit-backend/master/assets/solr-versions.json');
                result[service][repo] = JSON.parse(solrData);
              } else if (artifact === 'pipelines') {
                // apt install la-pipelines=2.9.9-SNAPSHOT\*
                // apt-cache madison la-pipelines  | cut -d"|" -f 1,2 | cut -d"+" -f 1 | sort -r | uniq
                // Other option but does not match la-pipelines releases:
                // let pipelinesUrl = 'https://api.github.com/repos/gbif/pipelines/tags';
                // console.log(`${artifact} ${versions}`);
                result[service][repo] = pVersions;
              } else {
                let artifactConv = artifact === 'ala-namematching-server' ? 'names/ala-namematching-server' : artifact;
                let nexusUrl = `https://nexus.ala.org.au/service/local/repositories/${repo}/content/au/org/ala/${artifactConv}/maven-metadata.xml`;
                //if (process.env.NODE_ENV !== 'production') console.log(`url: ${nexusUrl}`);
                const xmlData = await request(nexusUrl);
                // https://nexus.ala.org.au/service/local/repositories/releases/content/au/org/ala/ala-hub/4.0.8/ala-hub-4.0.8.war
                // https://nexus.ala.org.au/service/local/repositories/snapshots/content/au/org/ala/ala-hub/maven-metadata.xml
                if (parser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
                  let jsonObj = parser.parse(xmlData, {
                    numParseOptions: {
                      skipLike: /[0-9.]*/
                    }
                  });
                  // if only one element it does not return an array of versions only the version, so:
                  // https://stackoverflow.com/questions/1961528/how-to-create-an-array-if-an-array-does-not-exist-yet
                  if (result[service][repo] != null) {
                    result[service][repo]['metadata']['versioning']['versions']['version'] = [...result[service][repo]['metadata']['versioning']['versions']['version'], ...[].concat(jsonObj['metadata']['versioning']['versions']['version'])];
                  } else {
                    result[service][repo] = jsonObj;
                  }
                  // if (service === 'collectory' || service === 'ala-collectory') console.log(`${service} (${repo}): artifact: ${artifact} ${JSON.stringify(result[service][repo])}`);
                }
              }
            } catch (e) {
              console.log(`ERROR: Exception getting '${artifact}' in '${repo}', message: ${e.message}`);
              // throw "getError";
            }
          }
        }
      }));
    // Here we exclude versions that for some reason (bugs, old, security issues) we don't want to show to the user in the UI software selector
    try {
      const excludeList = await request('https://raw.githubusercontent.com/living-atlases/la-toolkit-backend/master/assets/soft-versions-exclude-list.json');
      result['excludeList'] = JSON.parse(excludeList);
      return this.res.json(result);
    } catch (e) {
      console.log(result);
      console.log("Failed to parse the previous json");
      throw "getError";
    }
  }
}
