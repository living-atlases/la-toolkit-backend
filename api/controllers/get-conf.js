module.exports = async function getAppConf(req, res) {
  let projects = await Project.find({}) // Here for some group maybe in the future if users/groups are used
    .populate('servers')
    .populate('services')
    .populate('variables')
    .populate('serviceDeploys')
    .populate('cmdHistoryEntries')
    .then(async (ps) => {
      for (const p of ps) {
        p.serverServices = {};
        //console.log(p.servers);
        let sMap = {};
        let svMap = {};
        let vMap = {};
        for (const s of p.servers) {
          let sds = await ServiceDeploy.find({
            projectId: p.id,
            serverId: s.id,
          }).populate('serviceId');
          let serverServices = [];
          for (const sd of sds) {
            serverServices.push(sd.serviceId.nameInt);
          }
          p.serverServices[s.id] = serverServices;
          sMap[s.id] = s;
        }
        for (const sv of p.services) {
          svMap[sv.nameInt] = sv;
        }
        for (const v of p.variables) {
          vMap[v.nameInt] = v;
        }
        p.serversMap = sMap;
        p.services = svMap;
        p.variables = vMap;
        //  console.log(p.serverServices);

        for (const cmdH of p.cmdHistoryEntries) {
          cmdH.cmd = await Cmd.findOne({ cmdHistoryEntryId: cmdH.id });
        }
      }
      for (const p of ps) {
        // console.log(p.serverServices);
      }
      return ps;
    })
    .catch((err) => {
      throw err;
    });

  // console.log(projects);

  // If the conf file does not exits, return a empty conf
  // conf = '{}';
  /* for (const p in projects) {
   *   p.serverServices = {};
   *   for (const s in p.servers) {
   *     await serviceDeploy.find({ projectId: p.id, serverid: s.id });
   *   }
   * } */
  return res.json({ projects: projects });
};
