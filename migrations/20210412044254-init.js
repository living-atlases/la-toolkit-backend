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

/*
   Types from:
   node_modules/db-migrate-shared/data_type.js

  CHAR: 'char',
  STRING: 'string',
  TEXT: 'text',
  SMALLINT: 'smallint',
  BIGINT: 'bigint',
  INTEGER: 'int',
  SMALL_INTEGER: 'smallint',
  BIG_INTEGER: 'bigint',
  REAL: 'real',
  DATE: 'date',
  DATE_TIME: 'datetime',
  TIME: 'time',
  BLOB: 'blob',
  TIMESTAMP: 'timestamp',
  BINARY: 'binary',
  BOOLEAN: 'boolean',
  DECIMAL: 'decimal'
*/

// https://db-migrate.readthedocs.io/en/latest/API/NoSQL/
exports.up = function (db) {
  return db.createCollection('ssh_keys').then((r) => {
    db.createCollection('cmds').then((r) => {
      db.createCollection('cmd_history_entries').then((r) => {
        db.createCollection('variables').then((r) => {
          db.createCollection('service_deploys').then((r) => {
            db.createCollection('services').then((r) => {
              db.createCollection('servers').then((r) => {
                db.createCollection('projects');
              });
            });
          });
        });
      });
    });
  });
  exports.down = function (db) {
    return db.dropCollection('projects').then((r) => {
      db.dropCollection('servers').then((r) => {
        db.dropCollection('services').then((r) => {
          db.dropCollection('service_deploys').then((r) => {
            db.dropCollection('variables').then((r) => {
              db.dropCollection('cmd_history_entries').then((r) => {
                db.dropCollection('cmds').then((r) => {
                  db.dropCollection('ssh_keys').then((r) => {});
                });
              });
            });
          });
        });
      });
    });
  };

  exports._meta = {
    version: 1,
  };
};
