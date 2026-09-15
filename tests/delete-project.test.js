const test = require('ava');
const sails = require('sails');

// Deleting a portal must not leave hub deploys pointing at its destroyed clusters.

test.before(() => {
  return new Promise((resolve, reject) => {
    sails.lift(
      {
        hooks: { grunt: false },
        log: { level: 'warn' },
        port: 13375,
        // Own directory: ava runs files in parallel and `migrate: 'drop'` on a
        // shared .tmp/localDiskDb races with the other lifts.
        datastores: { default: { adapter: 'sails-disk', dir: '.tmp/localDiskDb-delete-project' } },
        models: { migrate: 'drop' },
      },
      (err) => (err ? reject(err) : resolve())
    );
  });
});

test.after.always(() => {
  return new Promise((resolve, reject) => {
    sails.lower((err) => (err ? reject(err) : resolve()));
  });
});

const projectBase = (shortName) => ({
  longName: `Project ${shortName}`,
  shortName,
  domain: `${shortName}.org`,
  theme: 'clean',
  mapBoundsFstPoint: { lat: 0, lng: 0 },
  mapBoundsSndPoint: { lat: 10, lng: 10 },
  additionalVariables: '',
  genConf: {},
});

function del(id) {
  return new Promise((resolve, reject) => {
    sails.request(
      { method: 'DELETE', url: '/api/v1/delete-project' },
      { id },
      (err, res, body) => (err ? reject(err) : resolve({ res, body }))
    );
  });
}

test('deleting the portal removes the hub deploys on its clusters', async (t) => {
  const portal = await Project.create(projectBase('portal')).fetch();
  const server = await Server.create({ name: 'la-mh-1', ip: '10.0.0.1', projectId: portal.id }).fetch();
  const cluster = await Cluster.create({ name: 'compose', type: 'dockerCompose', projectId: portal.id, serverId: server.id }).fetch();
  const hub = await Project.create({ ...projectBase('hub'), isHub: true }).fetch();
  await Project.addToCollection(hub.id, 'parent', portal.id);
  const hubRecords = await Service.create({ nameInt: 'ala_hub', projectId: hub.id, iniPath: 'records', suburl: 'records' }).fetch();
  await ServiceDeploy.create({ projectId: hub.id, serverId: server.id, clusterId: cluster.id, serviceId: hubRecords.id, type: 'dockerCompose', additionalVariables: '' });
  const hubVm = await Server.create({ name: 'hub-vm', ip: '10.0.0.9', projectId: hub.id }).fetch();
  await ServiceDeploy.create({ projectId: hub.id, serverId: hubVm.id, serviceId: hubRecords.id, type: 'vm', additionalVariables: '' });

  const { res } = await del(portal.id);
  t.is(res.statusCode, 200);

  t.is(await Cluster.count({ id: cluster.id }), 0);
  t.is(await ServiceDeploy.count({ clusterId: cluster.id }), 0, 'the hub deploy on the portal cluster is gone');
  t.is(await ServiceDeploy.count({ projectId: hub.id, serverId: hubVm.id }), 1, 'the hub deploy on its own VM stays');
  t.is(await Project.count({ id: hub.id }), 1, 'the hub itself is not deleted');
});
