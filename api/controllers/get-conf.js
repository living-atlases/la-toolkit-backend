const fs = require('fs');
const { appConf } = require('../libs/utils.js');

module.exports = async function getAppConf(req, res) {
  let conf = fs.readFileSync(appConf(), 'utf8');
  let confParsed;
  try {
    confParsed = JSON.parse(conf);
  } catch (e) {
    confParsed = '{}';
  }
  return res.json(confParsed);
};
