const test = require('ava');
const sails = require('sails');

// A data hub places its services on the PORTAL's compose cluster: its
// ServiceDeploy rows reference a cluster the hub does not own. populate-project
// must still bucket them into the hub's clusterServices.

test.before(() => {
  return new Promise((resolve, reject) => {
    sails.lift(
      {
        hooks: { grunt: false },
        log: { level: 'warn' },
        port: 13374,
        // Own directory: ava runs files in parallel and `migrate: 'drop'` on a
        // shared .tmp/localDiskDb races with the other lifts.
        datastores: { default: { adapter: 'sails-disk', dir: '.tmp/localDiskDb-populate-project' } },
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

test('a hub deploy on the portal cluster lands in the hub clusterServices', async (t) => {
  const portal = await Project.create(projectBase('portal')).fetch();
  const server = await Server.create({ name: 'la-mh-1', ip: '10.0.0.1', projectId: portal.id }).fetch();
  const cluster = await Cluster.create({
    name: 'compose',
    type: 'dockerCompose',
    projectId: portal.id,
    serverId: server.id,
  }).fetch();
  const portalHub = await Service.create({ nameInt: 'ala_hub', projectId: portal.id, iniPath: 'records', suburl: 'records' }).fetch();
  await ServiceDeploy.create({ projectId: portal.id, serverId: server.id, clusterId: cluster.id, serviceId: portalHub.id, type: 'dockerCompose', additionalVariables: '' });

  const hub = await Project.create({ ...projectBase('hub'), isHub: true }).fetch();
  await Project.addToCollection(hub.id, 'parent', portal.id);
  const hubRecords = await Service.create({ nameInt: 'ala_hub', projectId: hub.id, iniPath: 'records', suburl: 'records' }).fetch();
  await ServiceDeploy.create({ projectId: hub.id, serverId: server.id, clusterId: cluster.id, serviceId: hubRecords.id, type: 'dockerCompose', additionalVariables: '' });

  const [p] = await sails.helpers.populateProject({ id: portal.id });
  t.deepEqual(p.clusterServices[cluster.id], ['ala_hub'], 'the portal keeps its own');
  t.is(p.hubs.length, 1);
  const h = p.hubs[0];
  t.deepEqual(h.clusters, [], 'the hub owns no cluster');
  t.deepEqual(h.clusterServices[cluster.id], ['ala_hub'], 'but its deploy on the portal cluster is bucketed');
  t.deepEqual(h.serverServices, {}, 'and nothing leaks into serverServices');
});
