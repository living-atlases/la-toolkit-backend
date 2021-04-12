'use strict';
const sails = require('sails');
const { sailsLoadSync, appConfSync } = require('../api/libs/utils.js');

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
  let conf = await appConfSync();

  await SshKey.createEach(conf['sshKeys']);
  sails.lower();
  return;
  // return db.insert('ssh_keys', conf['sshKeys']);
};

exports.down = async function (db) {
  await sailsLoadSync();
  await SshKey.destroy({});
  sails.lower();
  return;
};

exports._meta = {
  version: 4,
};
