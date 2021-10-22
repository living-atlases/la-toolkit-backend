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
    console.log("Checking 'la-pipelines' available versions");
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
    repo: {
      type: 'string',
      description: 'the repo to get the version',
      required: true,
    },
    artifact: {
      type: 'string',
      description: 'the artifact to get the version',
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

    if (inputs.artifact === 'pipelines') {
      // apt install la-pipelines=2.9.9-SNAPSHOT\*
      // apt-cache madison la-pipelines  | cut -d"|" -f 1,2 | cut -d"+" -f 1 | sort -r | uniq
      // Other option but does not match la-pipelines releases:
      // let pipelinesUrl = 'https://api.github.com/repos/gbif/pipelines/tags';
      let versions = await pipelinesVersions();
      // console.log(`${inputs.artifact} ${versions}`);
      return this.res.json(versions);
    } else {
      let nexusUrl = `https://nexus.ala.org.au/service/local/repositories/${inputs.repo}/content/au/org/ala/${inputs.artifact}/maven-metadata.xml`;
      try {
        const xmlData = await request(nexusUrl);
        // https://nexus.ala.org.au/service/local/repositories/releases/content/au/org/ala/ala-hub/4.0.8/ala-hub-4.0.8.war
        // https://nexus.ala.org.au/service/local/repositories/snapshots/content/au/org/ala/ala-hub/maven-metadata.xml
        if (parser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
          const jsonObj = parser.parse(xmlData, {
            numParseOptions: {
              skipLike: /[0-9.]*/
            }
          });
          // console.log(`${inputs.artifact} ${JSON.stringify(jsonObj)}`);
          return this.res.json(jsonObj);
        }
      } catch (e) {
        console.log(`url: ${nexusUrl}`);
        console.log(`message: ${e.message}`);
        throw "getError";
      }
    }
    throw 'getError';
  }
  ,
};
