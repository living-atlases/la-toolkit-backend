const bent = require('bent');
const request = bent('string');
const parser = require('fast-xml-parser');

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

  fn: async function (inputs) {

    const xmlData = await request(`https://nexus.ala.org.au/service/local/repositories/${inputs.repo}/content/au/org/ala/${inputs.artifact}/maven-metadata.xml`);
    // https://nexus.ala.org.au/service/local/repositories/releases/content/au/org/ala/ala-hub/4.0.8/ala-hub-4.0.8.war

    if (parser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
      const jsonObj = parser.parse(xmlData, {
        numParseOptions: {
          skipLike: /[0-9.]*/
        }
      });
      return this.res.json(jsonObj);
    }
    throw 'getError';
  },
};
