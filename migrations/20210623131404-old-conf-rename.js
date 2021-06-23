'use strict';
const p = require('path');
const fs = require('fs');
const { appConf } = require('../api/libs/utils.js');

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = async function (db) {
  console.log('Renaming old conf file');
  let oldAppConf = appConf();
  if (fs.existsSync(oldAppConf)) {
    fs.rename(oldAppConf, `${oldAppConf}.migrated`, () => {
      console.log(
        `Old '${oldAppConf}' renamed to '${oldAppConf}.migrated' as is already migrated`
      );
    });
  }
  sails.lower();
  return;
};

exports.down = async function (db) {
  return;
};

exports._meta = {
  version: 1,
};
