// Backfill ServiceDeploy.type and drop the duplicates its absence created.
//
// The model had no `type` attribute, so Waterline silently dropped the value the toolkit
// sent on every save. Read back, a docker deploy looked like a VM one. The toolkit looks a
// deploy up by (project, service, server, cluster, type), so it never found its own docker
// deploys and created a new one on each assignment — seeded from the version in the
// imported inventory, which quietly reverted whatever version had been picked in the UI.
//
// Type comes from the deploy's cluster (clusters carry it correctly); deploys with no
// cluster are VM ones. Then, per (project, service, server, cluster, type), keep a single
// deploy: the one that actually carries software versions, most recently updated.

module.exports = {
  async up(db) {
    const deploys = db.collection('service_deploys');
    const clusters = db.collection('clusters');

    const clusterType = new Map();
    for (const c of await clusters.find({}, { projection: { type: 1 } }).toArray()) {
      clusterType.set(String(c._id), c.type || 'vm');
    }

    const missingType = await deploys.find({ type: { $exists: false } }).toArray();
    console.log(`Backfilling type on ${missingType.length} service deploys`);
    for (const d of missingType) {
      const type = d.clusterId ? clusterType.get(String(d.clusterId)) || 'vm' : 'vm';
      await deploys.updateOne({ _id: d._id }, { $set: { type } });
    }

    // Deduplicate. Sorting decides which one survives: a deploy with software versions
    // beats an empty one (an empty duplicate is a deploy nobody ever configured), then
    // the most recently updated.
    const groups = await deploys
      .aggregate([
        {
          $group: {
            _id: {
              projectId: '$projectId',
              serviceId: '$serviceId',
              serverId: '$serverId',
              clusterId: '$clusterId',
              type: '$type',
            },
            ids: { $push: '$_id' },
            n: { $sum: 1 },
          },
        },
        { $match: { n: { $gt: 1 } } },
      ])
      .toArray();

    let removed = 0;
    for (const g of groups) {
      const docs = await deploys.find({ _id: { $in: g.ids } }).toArray();
      docs.sort((a, b) => {
        const versions = (d) => Object.keys(d.softwareVersions || {}).length > 0;
        if (versions(a) !== versions(b)) return versions(a) ? -1 : 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      const [, ...losers] = docs;
      await deploys.deleteMany({ _id: { $in: losers.map((d) => d._id) } });
      removed += losers.length;
    }
    console.log(`Removed ${removed} duplicated service deploys in ${groups.length} groups`);
  },

  async down(db) {
    // The duplicates cannot be restored, and they were never wanted. Only drop the field.
    await db.collection('service_deploys').updateMany({}, { $unset: { type: '' } });
  },
};
