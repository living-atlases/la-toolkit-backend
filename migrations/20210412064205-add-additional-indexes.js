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

exports.up = function (db) {
  return db.addIndex('servers', 'name_idx', 'name', false).then((r) => {
    db.addIndex('servers', 'ip_idx', 'ip', false).then((r) => {
      db.addIndex('services', 'name_int_idx', 'nameInt', false).then((r) => {
        db.addIndex('variables', 'name_int_idx', 'nameInt', false).then((r) => {
          db.addIndex('ssh_keys', 'name_idx', 'name', false).then((r) => {});
        });
      });
    });
  });
};

exports.down = function (db) {
  return db.removeIndex('servers', 'name_idx', 'name', false).then((r) => {
    db.removeIndex('servers', 'ip_idx', 'ip', false).then((r) => {
      db.removeIndex('services', 'name_int_idx', 'nameInt', false).then((r) => {
        db.removeIndex('variables', 'name_int_idx', 'nameInt', false).then(
          (r) => {
            db.removeIndex(
              'ssh_keys',
              'name_idx',
              'name',
              false
            ).then((r) => {});
          }
        );
      });
    });
  });
};

exports._meta = {
  version: 2,
};
