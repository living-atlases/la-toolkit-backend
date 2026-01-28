const sails = require('sails');

module.exports = {
  async up(db, client) {
    return new Promise((resolve, reject) => {
      sails.lift({
        hooks: { grunt: false },
        log: { level: 'error' }
      }, async (err) => {
        if (err) return reject(err);
        try {
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
