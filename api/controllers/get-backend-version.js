module.exports = {
  friendlyName: 'Get backend version',

  description: '',

  inputs: {},

  exits: {},

  fn: async function () {
    var pjson = require('../../package.json');
    return this.res.send(pjson);
  },
};
