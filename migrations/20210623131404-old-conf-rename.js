const fs = require('fs');
const { appConf } = require('../api/libs/utils.js');

module.exports = {
  async up(db, client) {
    console.log('Renaming old conf file');
    let oldAppConf = appConf();
    if (fs.existsSync(oldAppConf)) {
      fs.renameSync(oldAppConf, `${oldAppConf}.migrated`);
      console.log(`Old '${oldAppConf}' renamed to '${oldAppConf}.migrated' as is already migrated`);
    }
  },

  async down(db, client) {
    // No-op
  }
};
