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
  let projsToTrans = conf['projects'];
  let projectsMap = conf['projectsMap'];
  for (const p of projsToTrans) {
    let genConf = projectsMap[p.uuid];
    delete genConf.LA_uuid;
    p.genConf = genConf;

    p.isHub = false;
    delete p.uuid;
    // https://stackoverflow.com/a/37576787
    let servers = p.servers;
    let services = p.services;
    let variables = p.variables;
    let serverServices = p.serverServices;
    let cmdHistory = p.cmdHistory;
    let lastCmdEntry = p.lastCmdEntry;
    delete p.servers;
    delete p.services;
    delete p.variables;
    delete p.cmdHistory;
    delete p.serversMap;
    delete p.serverServices;
    delete p.lastCmdEntry;

    var createdP = await Project.create(p).fetch();

    genConf.LA_id = createdP.id;

    await Project.update({ id: createdP.id }).set({ genConf: genConf });

    for (const sv of Object.values(services)) {
      delete sv.uuid;
      delete sv.status;
      sv.projectId = createdP.id;
      await Service.create(sv);
    }

    for (const s of servers) {
      let sUuid = s.uuid;
      delete s.uuid;
      s.projectId = createdP.id;
      if (p.sshUser == null) {
        delete s.sshUser;
      }
      let createdS = await Server.create(s).fetch();
      for (const i in serverServices[sUuid]) {
        let svName = serverServices[sUuid][i];
        let sv = await Service.findOne({
          nameInt: svName,
          projectId: createdP.id,
        });
        await ServiceDeploy.create({
          additionalVariables: '',
          serviceId: sv.id,
          serverId: createdS.id,
          projectId: createdP.id,
        });
      }
    }
    for (const v in variables) {
      variables[v].projectId = createdP.id;
      await Variable.create(variables[v]);
    }
    for (const cH of cmdHistory) {
      let cHUuid = cH.uuid;
      delete cH.uuid;
      cH.rawCmd = cH.cmd;
      delete cH.cmd;
      let cmd = { properties: cH.deployCmd };
      // p.createdAt = cH.date;
      let d = new Date(cH.date);
      cH.createdAt = d;
      cH.updatedAt = d;
      cmd.createdAt = d;
      cmd.updatedAt = d;
      delete cH.date;
      cH.projectId = createdP.id;
      let cHcreated = await CmdHistoryEntry.create(cH).fetch();
      cmd.cmdHistoryEntryId = cHcreated.id;
      cmd.type =
        cH.preDeployCmd != null
          ? 'preDeploy'
          : cH.postDeployCmd != null
          ? 'postDeploy'
          : 'deploy';
      delete cH.postDeployCmd;
      delete cH.preDeployCmd;
      delete cH.deployCmd;

      if (lastCmdEntry != null && lastCmdEntry.uuid === cHUuid) {
        // Update project with the lastCmdEntry id or just use the date?
      }
      await Cmd.create(cmd).fetch();
    }
    // let pMigrated =
    /* await Project.findOne({ id: createdP.id })
      .populate('servers')
      .populate('services')
      .populate('variables')
      .populate('serviceDeploys'); */
    // console.log(pMigrated);
  }
  sails.lower();

  return;
};

exports.down = async function (db) {
  // TODO comment to the end to prevent wipe the db
  await sailsLoadSync();
  await Variable.destroy({});
  await Cmd.destroy({});
  await CmdHistoryEntry.destroy({});
  await ServiceDeploy.destroy({});
  await Service.destroy({});
  await Server.destroy({});
  await Project.destroy({});
  sails.lower();
  return;
};

exports._meta = {
  version: 3,
};
