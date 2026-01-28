module.exports = {
  async up(db, client) {
    // Helper function to create collection only if it doesn't exist
    async function createCollectionIfNotExists(collectionName) {
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        await db.createCollection(collectionName);
        console.log(`Created collection ${collectionName}`);
      } else {
        console.log(`Collection ${collectionName} already exists, skipping`);
      }
    }

    await createCollectionIfNotExists('cmds');
    await createCollectionIfNotExists('cmd_history_entries');
    await createCollectionIfNotExists('variables');
    await createCollectionIfNotExists('service_deploys');
    await createCollectionIfNotExists('services');
    await createCollectionIfNotExists('servers');
    await createCollectionIfNotExists('projects');
    await createCollectionIfNotExists('groups');
    await createCollectionIfNotExists('users');
  },

  async down(db, client) {
    // Helper function to drop collection only if it exists
    async function dropCollectionIfExists(collectionName) {
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length > 0) {
        await db.dropCollection(collectionName);
        console.log(`Dropped collection ${collectionName}`);
      } else {
        console.log(`Collection ${collectionName} not found, skipping`);
      }
    }

    await dropCollectionIfExists('projects');
    await dropCollectionIfExists('servers');
    await dropCollectionIfExists('services');
    await dropCollectionIfExists('service_deploys');
    await dropCollectionIfExists('variables');
    await dropCollectionIfExists('cmd_history_entries');
    await dropCollectionIfExists('cmds');
    await dropCollectionIfExists('groups');
    await dropCollectionIfExists('users');
  }
};
