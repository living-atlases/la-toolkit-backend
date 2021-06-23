'use strict';

const { sailsLoadSync } = require('../api/libs/utils.js');

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
  await sailsLoadSync();
  let servers = await Server.find({});
  for await (let server of servers) {
    console.log(`migrating server ${server.name}`);
    let gwNames = server.gateways;
    let gwIds = [];
    for await (let gwName of gwNames) {
      let s = await Server.findOne({
        name: gwName,
        projectId: server.projectId,
      });
      if (s) {
        gwIds.push(s.id);
      }
    }
    await Server.updateOne({ id: server.id }).set({ gateways: gwIds });
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
