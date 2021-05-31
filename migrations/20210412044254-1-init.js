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
exports.up = async function (db) {
  await db.createCollection('cmds');
  await db.createCollection('cmd_history_entries');
  await db.createCollection('variables');
  await db.createCollection('service_deploys');
  await db.createCollection('services');
  await db.createCollection('servers');
  await db.createCollection('projects');
  await db.createCollection('groups');
  return await db.createCollection('users');
};

exports.down = async function (db) {
  await db.dropCollection('projects');
  await db.dropCollection('servers');
  await db.dropCollection('services');
  await db.dropCollection('service_deploys');
  await db.dropCollection('variables');
  await db.dropCollection('cmd_history_entries');
  await db.dropCollection('cmds');
  await db.dropCollection('groups');
  return await db.dropCollection('users');
};

exports._meta = {
  version: 1,
};
