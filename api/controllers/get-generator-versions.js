const bent = require('bent');
const getJSON = bent('json');

module.exports = async function getGeneratorVersion(req, res) {
  let obj = await getJSON('https://registry.npmjs.org/generator-living-atlas');
  return res.json(obj);
};
