async function populateP(query) {
  return await Project.find(query) // Here for some group maybe in the future if users/groups are used
    .populate("servers")
    .populate("services")
    .populate("clusters")
    .populate("variables")
    .populate("serviceDeploys")
    .populate("cmdHistoryEntries", {
      sort: "createdAt DESC",
      limit: 5,
    })
    .populate("hubs")
    .then(async (ps) => {
      // console.log(`Populate projects size: ${ps.length}, query: ${JSON.stringify(query)}`);
      for (const p of ps) {
        p.serverServices = {};
        p.clusterServices = {};
        //console.log(p.servers);
        let sMap = {};
        let cMap = {};
        let svMap = {};
        let vMap = {};
        for (const s of p.servers) {
          let sds = await ServiceDeploy.find({
            projectId: p.id,
            serverId: s.id,
          }).populate("serviceId");
          let serverServices = [];
          for (const sd of sds) {
            serverServices.push(sd.serviceId.nameInt);
          }
          p.serverServices[s.id] = serverServices;
          sMap[s.id] = s;
        }
        for (const c of p.clusters) {
          let cds = await ServiceDeploy.find({
            projectId: p.id,
            clusterId: c.id,
          }).populate("serviceId");
          let clusterServices = [];
          for (const cd of cds) {
            clusterServices.push(cd.serviceId.nameInt);
          }
          p.clusterServices[c.id] = clusterServices;
          cMap[c.id] = c;
        }

        for (const sv of p.services) {
          svMap[sv.nameInt] = sv;
        }
        for (const v of p.variables) {
          vMap[v.nameInt] = v;
        }
        p.serversMap = sMap;
        p.servicesMap = svMap;
        p.variablesMap = vMap;

        let cmdHistoryPopulated = [];

        for (const cmdH of p.cmdHistoryEntries) {
          // noinspection JSUnresolvedFunction
          cmdH.cmd = await Cmd.findOne({ cmdHistoryEntryId: cmdH.id });
          if (cmdH.cmd == null) {
            console.warn(`Missing cmd for CmdHistoryEntryId ${cmdH.id}`);
            await CmdHistoryEntry.destroyOne({ id: cmdH.id });
          } else {
            cmdH.date = cmdH.createdAt;
            cmdHistoryPopulated.push(cmdH);
          }
        }
        p.cmdHistoryEntries = cmdHistoryPopulated;

        // Hubs
        if (p.hubs != null && p.hubs.length > 0) {
          let hubs = [];
          for (let hub of p.hubs) {
            let populatedHub = await populateP({ id: hub.id });
            hubs.push(populatedHub[0]);
          }
          p.hubs = hubs;
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
}

module.exports = {
  friendlyName: "Populate project",

  description: "",

  inputs: {
    query: {
      type: "json",
      description: "A project query",
      required: false,
      defaultsTo: {
        where: { isHub: false },
        sort: "updatedAt DESC",
      },
      custom: function (value) {
        return _.isObject(value);
      },
    },
  },

  exits: {
    success: {
      description: "All done.",
    },
  },

  fn: async function (inputs) {
    return await populateP(inputs.query);
  },
};
