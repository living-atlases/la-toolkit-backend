module.exports = {
  friendlyName: 'Populate project',

  description: '',

  inputs: {
    query: {
      type: 'json',
      description: 'A project query',
      required: false,
      defaultsTo: {
        sort: 'updatedAt DESC',
      },
      custom: function (value) {
        return _.isObject(value);
      },
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    return await Project.find(inputs.query) // Here for some group maybe in the future if users/groups are used
      .populate('servers')
      .populate('services')
      .populate('variables')
      .populate('serviceDeploys')
      .populate('cmdHistoryEntries', {
        sort: 'createdAt DESC',
      })
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
          p.servicesMap = svMap;
          p.variablesMap = vMap;
          //  console.log(p.serverServices);

          for (const cmdH of p.cmdHistoryEntries) {
            cmdH.cmd = await Cmd.findOne({ cmdHistoryEntryId: cmdH.id });
            cmdH.date = cmdH.createdAt;
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
  },
};
