const bent = require('bent');
const getBuffer = bent('buffer');

module.exports = async function proxy(req, res) {
  var url = req.params[0];
  let buffer = await getBuffer(url);
  return res.send(buffer);
};
