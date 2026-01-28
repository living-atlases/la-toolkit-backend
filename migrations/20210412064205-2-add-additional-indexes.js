module.exports = {
  async up(db, client) {
    await db.collection('servers').createIndex({ name: 1 });
    await db.collection('servers').createIndex({ ip: 1 });
    await db.collection('services').createIndex({ nameInt: 1 });
    await db.collection('variables').createIndex({ nameInt: 1 });
  },

  async down(db, client) {
    await db.collection('servers').dropIndex('name_1');
    await db.collection('servers').dropIndex('ip_1');
    await db.collection('services').dropIndex('nameInt_1');
    await db.collection('variables').dropIndex('nameInt_1');
  }
};
