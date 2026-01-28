const sails = require('sails');
const { appConfSync } = require('../api/libs/utils.js');

module.exports = {
  async up(db, client) {
    // Check if migration was already applied
    const projectsCollection = db.collection('projects');
    const existingProjects = await projectsCollection.find({}).limit(1).toArray();

    // If there are projects and they already have genConf, skip migration
    if (existingProjects.length > 0 && existingProjects[0].genConf) {
      console.log('Migration already applied (projects have genConf), skipping');
      return;
    }

    let conf = await appConfSync();
    let projsToTrans = conf['projects'];
    let projectsMap = conf['projectsMap'];

    // If there's nothing to migrate, skip
    if (!projsToTrans || projsToTrans.length === 0) {
      console.log('No old-format projects to migrate, skipping');
      return;
    }

    return new Promise((resolve, reject) => {
      sails.lift({
        hooks: {
          grunt: false,
          // Disable problematic hooks during migration
          helpers: false,
          security: false
        },
        log: { level: 'error' }
      }, async (err) => {
        if (err) return reject(err);
        try {
          for (const p of projsToTrans) {
            let genConf = projectsMap[p.uuid];
            delete genConf.LA_uuid;
            p.genConf = genConf;

            p.isHub = false;
            delete p.uuid;

            let servers = p.servers;
            let services = p.services;
            let variables = p.variables;
            let serverServices = p.serverServices;
            let cmdHistory = p.cmdHistory;

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
              let d = new Date(cH.date);
              cH.createdAt = d;
              cH.updatedAt = d;
              cmd.createdAt = d;
              cmd.updatedAt = d;
              delete cH.date;
              cH.projectId = createdP.id;
              cmd.type =
                cH.preDeployCmd != null
                  ? 'preDeploy'
                  : cH.postDeployCmd != null
                    ? 'postDeploy'
                    : 'deploy';
              delete cH.postDeployCmd;
              delete cH.preDeployCmd;
              delete cH.deployCmd;

              cH.invDir =
                cmd.type === 'deploy'
                  ? `${createdP.dirName}/${createdP.dirName}-inventories/`
                  : cmd.type === 'preDeploy'
                    ? `${createdP.dirName}/${createdP.dirName}-pre-deploy/`
                    : `${createdP.dirName}/${createdP.dirName}-post-deploy/`;

              let cHcreated = await CmdHistoryEntry.create(cH).fetch();
              cmd.cmdHistoryEntryId = cHcreated.id;

              await Cmd.create(cmd).fetch();
            }
          }
          sails.lower(resolve);
        } catch (e) {
          sails.lower(() => reject(e));
        }
      });
    });
  },

  async down(db, client) {
    // No-op
  }
};

