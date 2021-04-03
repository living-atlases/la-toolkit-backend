module.exports = {
  friendlyName: 'Test host services',

  description: '',

  inputs: {
    hostsServices: {
      type: 'json',
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs) {
    let map = inputs.hostsServices.map;
    let servers = Object.keys(map);

    // Prepare results object
    let results = {};
    servers.forEach((s) => (results[s] = {}));

    try {
      Object.entries(map).forEach(async ([server, services]) => {
        // Check on each server each service
        // console.log(services);
        await sails.helpers.checkTcp.with({
          ports: services.tcpPorts,
          server: server,
        });
        await sails.helpers.checkUdp.with({
          ports: services.udpPorts,
          server: server,
        });
        await sails.helpers.checkOther.with({
          server: server,
          checks: services.otherChecks,
        });
        await sails.helpers.checkUrls.with({
          server: server,
          urls: services.urls,
        });

        // Check the same services in the rest of servers
        let otherServers = servers.filter((s) => s !== server);
        //console.log(`--------- server: ${server} others: ${otherServers}`);
        await sails.helpers.checkTcp.with({
          ports: services.tcpPorts,
          server: server,
          otherServers: otherServers,
        });
        await sails.helpers.checkUdp.with({
          ports: services.udpPorts,
          server: server,
          otherServers: otherServers,
        });
        await sails.helpers.checkUrls.with({
          server: server,
          urls: services.urls,
          otherServers: otherServers,
        });

        // Check urls from here
        /* await sails.helpers.checkUrls.with({
        server: server,
        urls: services.urls,
        otherServers: ['localhost'],
      });  As we are using ssh commented */
      });
      // console.log(results);
      this.res.json(results);
    } catch (e) {
      console.log(e);
      this.res.serverError(e);
    }
  },
};
