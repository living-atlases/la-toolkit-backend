const fs = require('fs');
const { appConf } = require('../libs/utils.js');

module.exports = async function getAppConf(req, res) {
  let confParsed;
  let conf;
  try {
    conf = fs.readFileSync(appConf(), 'utf8');
  } catch (e) {
    // If the conf file does not exits, return a empty conf
    conf = '{}';
  }
  try {
    confParsed = JSON.parse(conf);
  } catch (e) {
    console.error(e);
    res.serverError(e);
  }
  return res.json(confParsed);
};
