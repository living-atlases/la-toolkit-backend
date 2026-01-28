/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

module.exports.bootstrap = async function () {
  const fs = require('fs');
  const path = require('path');

  // Logic to detect if we are running with an old MongoDB 4.x data folder
  // MongoDB 4.4 used 'storage.bson' or lacked certain files present in 5.0+
  // A simple way is to check the data directory if we can access it, 
  // but since we are in the backend, we might not have direct access to /data/db.
  // However, we can try to connect to Mongo and check the version/compatibility.

  sails.config.custom.dbUpgradeRequired = false;

  try {
    const datastore = sails.getDatastore();
    const client = datastore.manager.client;
    // In Sails/Waterline with MongoDB, we can access the native client
    if (client) {
      const adminDb = client.db('admin');
      const serverStatus = await adminDb.command({ serverStatus: 1 });
      const version = serverStatus.version;
      console.log('MongoDB Server Version:', version);

      // If we are here, at least we connected. 
      // But if the user upgraded the IMAGE but NOT the data, 
      // Mongo usually fails to start or stays in a limited state.
    }
  } catch (err) {
    console.error('Initial MongoDB connection check failed:', err.message);
    // If it fails with a specific error related to protocol or version, 
    // we might suspect an upgrade issue.
    if (err.message.includes('saslContinue') || err.message.includes('OP_QUERY')) {
      sails.config.custom.dbUpgradeRequired = true;
    }
  }

  // Pre-load common package versions to improve client startup performance
  // This caches the most frequently requested dependency versions
  const getDepsVersions = require('../api/controllers/get-deps-versions');

  if (getDepsVersions.preloadVersions) {
    // Run in background to not block server startup
    getDepsVersions.preloadVersions().catch(err => {
      console.error('Background version pre-loading failed:', err.message);
    });
  }

  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return;
  // }
  //
  // await User.createEach([
  //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
  //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
  //   // etc.
  // ]);
  // ```

};
