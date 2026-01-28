module.exports = {
  async up(db, client) {
    const migrationsColl = db.collection('migrations');
    const changelogColl = db.collection('changelog');

    // Check if the old migration collection exists
    const colls = await db.listCollections({ name: 'migrations' }).toArray();
    if (colls.length === 0) {
      console.log('No old db-migrate collection found. Skipping bridge.');
      return;
    }

    console.log('Bridge: Porting db-migrate history to migrate-mongo...');
    const oldMigrations = await migrationsColl.find({}).toArray();

    for (const oldMigration of oldMigrations) {
      // db-migrate stores name as '/migrations/2021...'
      // migrate-mongo expects filename '2021....js'
      const nameParts = oldMigration.name.split('/');
      let fileName = nameParts[nameParts.length - 1];

      // Add .js extension if not present (db-migrate stored without extension)
      if (!fileName.endsWith('.js')) {
        fileName = fileName + '.js';
      }

      // Check if already in changelog to avoid duplicates
      const exists = await changelogColl.findOne({ fileName });
      if (!exists) {
        await changelogColl.insertOne({
          fileName: fileName,
          appliedAt: oldMigration.run_on || new Date()
        });
        console.log(`Ported status for ${fileName}`);
      } else {
        console.log(`${fileName} already in changelog, skipping`);
      }
    }

    // Optional: Rename the old collection to avoid future checks
    // await migrationsColl.rename('migrations_old');
  },

  async down(db, client) {
    // No-op
  }
};

