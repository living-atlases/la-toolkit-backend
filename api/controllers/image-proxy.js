// noinspection HttpUrlsUsage

const bent = require('bent');
const getBuffer = bent('buffer');
const { http, https } = require('follow-redirects');

module.exports = async function proxy(req, res) {
  let url = req.params[0];
  (url.indexOf('http://') === 0 ? http : https)
    .get(url, async (response) => {
      let buffer = await getBuffer(response.responseUrl);
      return res.send(buffer);
    })
    .on('error', (e) => {
      switch (e.code) {
        case 'ETIMEDOUT':
          res.status(408);
          break;
        case 'ENOTFOUND':
          res.status(404);
          break;
        default:
          res.status(500);
      }
      console.log(`code: ${e.code}`);
      console.log(`name: ${e.name}`);
      console.log(`message: ${e.message}`);
      res.send('Error retrieving the image');
    });
};
