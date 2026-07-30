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

// Detached deploys (spawnDetached in api/libs/ttyd-utils.js) survive a backend
// restart by design — they're unref'd from the request lifecycle so they keep
// running. The job now records its own exit code, so this only has to catch the
// runs that started before it did: those finish invisibly, leaving no exit-code
// file, and their CmdHistoryEntry.result stays 'unknown' ("checking...")
// forever unless a user happens to reopen that exact run (cmd-results.js's own
// fallback only kicks in on that on-demand view). Reconcile on startup instead
// of leaving it to chance.
const reconcileOrphanedDeploys = async () => {
  const fs = require('fs');
  const {
    exitCodeFile,
    deployPidFile,
    logsProdDevLocation,
  } = require('../api/libs/utils.js');
  const {deployAlive} = require('../api/libs/ttyd-utils.js');
  const {
    unknownExitCode,
    readAnsibleResults,
    ansibleExitCode,
    cmdResultFor,
  } = require('../api/libs/deploy-outcome.js');

  // Bounded and newest-first: an old 'unknown' entry was either already
  // resolved by a user viewing it, or predates the pidfile mechanism — there's
  // nothing safe to reconcile there, and no need to scan the whole history.
  const candidates = await CmdHistoryEntry.find({result: 'unknown'})
    .sort('createdAt DESC')
    .limit(200);

  for (const entry of candidates) {
    const pidFile = deployPidFile(
      logsProdDevLocation(),
      entry.logsPrefix,
      entry.logsSuffix
    );
    if (!fs.existsSync(pidFile)) {
      continue; // never a detached deploy (or predates it): leave as-is
    }

    const exFile = exitCodeFile(
      logsProdDevLocation(),
      entry.logsPrefix,
      entry.logsSuffix
    );
    if (fs.existsSync(exFile)) {
      continue; // already resolved; the frontend just hasn't viewed it yet
    }

    // Ask what is actually alive, not whether the pid in the file is. Under
    // `docker exec` that pid is the host-side client, which a backend restart
    // outlives — probing it would report a running deploy as dead and file it
    // as aborted while ansible is still working.
    if (deployAlive(entry.logsPrefix, entry.logsSuffix)) {
      continue; // genuinely still running
    }

    // Believe the recap if the run left one: it finished, and only the
    // recording of it was lost. Writing "unknown" here would be worse than
    // leaving the entry alone — the exit file's existence is what stops
    // cmd-results from deriving the outcome later, so a wrong guess sticks.
    const results = readAnsibleResults(entry.logsPrefix, entry.logsSuffix);
    const code = results.length > 0 ? ansibleExitCode(results) : unknownExitCode;
    const result = cmdResultFor(code, results);

    fs.writeFileSync(exFile, `${code}`, {encoding: 'utf8'});
    await CmdHistoryEntry.updateOne({id: entry.id}).set({result: result});
    console.log(
      `Reconciled orphaned deploy ${entry.logsPrefix}-${entry.logsSuffix} as ` +
        `${result} (exit ${code})`
    );
  }
};

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

  // Run in background to not block server startup
  reconcileOrphanedDeploys().catch(err => {
    console.error('Orphaned-deploy reconciliation failed:', err.message);
  });

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
