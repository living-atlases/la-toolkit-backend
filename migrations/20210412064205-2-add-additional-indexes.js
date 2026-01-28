module.exports = {
  async up(db, client) {
    // Helper function to create index only if it doesn't exist
    async function createIndexIfNotExists(collection, indexSpec, indexName) {
      try {
        const indexes = await collection.indexes();
        const indexExists = indexes.some(idx => {
          // Check if an index with the same keys exists
          const idxKeys = JSON.stringify(idx.key);
          const specKeys = JSON.stringify(indexSpec);
          return idxKeys === specKeys;
        });

        if (!indexExists) {
          await collection.createIndex(indexSpec);
          console.log(`Created index ${indexName}`);
        } else {
          console.log(`Index ${indexName} already exists, skipping`);
        }
      } catch (error) {
        // Ignore if index already exists with different name
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict' ||
          error.message.includes('Index already exists')) {
          console.log(`Index ${indexName} already exists with different options, skipping`);
        } else {
          throw error;
        }
      }
    }

    await createIndexIfNotExists(db.collection('servers'), { name: 1 }, 'name_1');
    await createIndexIfNotExists(db.collection('servers'), { ip: 1 }, 'ip_1');
    await createIndexIfNotExists(db.collection('services'), { nameInt: 1 }, 'nameInt_1');
    await createIndexIfNotExists(db.collection('variables'), { nameInt: 1 }, 'nameInt_1');
  },

  async down(db, client) {
    // Helper function to drop index only if it exists
    async function dropIndexIfExists(collection, indexName) {
      try {
        await collection.dropIndex(indexName);
        console.log(`Dropped index ${indexName}`);
      } catch (error) {
        if (error.code === 27 || error.codeName === 'IndexNotFound') {
          console.log(`Index ${indexName} not found, skipping`);
        } else {
          throw error;
        }
      }
    }

    await dropIndexIfExists(db.collection('servers'), 'name_1');
    await dropIndexIfExists(db.collection('servers'), 'ip_1');
    await dropIndexIfExists(db.collection('services'), 'nameInt_1');
    await dropIndexIfExists(db.collection('variables'), 'nameInt_1');
  }
};
