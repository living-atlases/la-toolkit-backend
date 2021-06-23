'use strict';

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
  await db.addIndex('servers', 'name_idx', 'name', false);
  await db.addIndex('servers', 'ip_idx', 'ip', false);
  await db.addIndex('services', 'name_int_idx', 'nameInt', false);
  return await db.addIndex('variables', 'name_int_idx', 'nameInt', false);
};

exports.down = async function (db) {
  await db.removeIndex('servers', 'name_idx', 'name', false);
  await db.removeIndex('servers', 'ip_idx', 'ip', false);
  await db.removeIndex('services', 'name_int_idx', 'nameInt', false);
  return await db.removeIndex('variables', 'name_int_idx', 'nameInt', false);
};

exports._meta = {
  version: 1,
};
