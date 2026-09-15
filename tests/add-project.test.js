const test = require('ava');
const sails = require('sails');
const { ObjectId } = require('mongodb');

// The add-project helper must be idempotent: the client mints every id, and a
// project can already be half-persisted (the create wizard used to PATCH
// /update-project before Finish). Adding it again completes it instead of
// failing with "Would violate uniqueness constraint".

test.before(() => {
  return new Promise((resolve, reject) => {
    sails.lift(
      {
        hooks: { grunt: false },
        log: { level: 'warn' },
        port: 13373,
        // Own directory: ava runs files in parallel and `migrate: 'drop'` on a shared
        // .tmp/localDiskDb races with the other lifts.
        datastores: { default: { adapter: 'sails-disk', dir: '.tmp/localDiskDb-add-project' } },
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

const oid = () => new ObjectId().toString();

function projectPayload({ isHub = false, parent = undefined, shortName } = {}) {
  const id = oid();
  const serviceId = oid();
  const serverId = oid();
  const clusterId = oid();
  return {
    id,
    isHub,
    parent,
    longName: `Project ${shortName}`,
    shortName,
    dirName: shortName,
    domain: `${shortName}.org`,
    theme: 'clean',
    mapBoundsFstPoint: { lat: 0, lng: 0 },
    mapBoundsSndPoint: { lat: 10, lng: 10 },
    additionalVariables: '',
    genConf: {},
    services: [
      { id: serviceId, nameInt: 'ala_hub', use: true, iniPath: 'records', suburl: 'records', projectId: id },
    ],
    variables: [
      { id: oid(), nameInt: 'ansible_user', service: 'all', value: 'ubuntu', projectId: id },
      { id: oid(), nameInt: 'favicon_url', service: 'all', value: 'x', projectId: id },
    ],
    servers: [{ id: serverId, name: `vm-${shortName}`, ip: '10.0.0.1', projectId: id }],
    clusters: [
      { id: clusterId, name: 'compose', type: 'dockerCompose', projectId: id, serverId },
    ],
    serviceDeploys: [
      { id: oid(), serviceId, serverId, clusterId, projectId: id, type: 'dockerCompose', additionalVariables: '' },
    ],
  };
}

// The helper mutates its input (deletes the association arrays), so callers
// pass a fresh deep copy each time, exactly like the controller does per request.
const clone = (o) => JSON.parse(JSON.stringify(o));

test('adding the same project twice does not throw nor duplicate rows', async (t) => {
  const p = projectPayload({ shortName: 'twice' });
  await sails.helpers.addProject.with({ project: clone(p) });
  await t.notThrowsAsync(() => sails.helpers.addProject.with({ project: clone(p) }));

  t.is(await Project.count({ id: p.id }), 1);
  t.is(await Variable.count({ projectId: p.id }), p.variables.length);
  t.is(await Service.count({ projectId: p.id }), p.services.length);
  t.is(await Server.count({ projectId: p.id }), 1);
  t.is(await Cluster.count({ projectId: p.id }), 1);
  t.is(await ServiceDeploy.count({ projectId: p.id }), 1);
});

test('a half-created project is completed', async (t) => {
  const p = projectPayload({ shortName: 'half' });
  // What the old create-wizard PATCHes left behind: rows, no project.
  await Variable.createEach(clone(p.variables));
  await Service.createEach(clone(p.services));
  t.falsy(await Project.findOne({ id: p.id }));

  await t.notThrowsAsync(() => sails.helpers.addProject.with({ project: clone(p) }));

  t.truthy(await Project.findOne({ id: p.id }));
  t.is(await Variable.count({ projectId: p.id }), p.variables.length);
  t.is(await Service.count({ projectId: p.id }), p.services.length);
  t.is(await Server.count({ projectId: p.id }), 1);
});

test('a hub is linked to its parent once, even when added twice', async (t) => {
  const portal = projectPayload({ shortName: 'portal' });
  await sails.helpers.addProject.with({ project: clone(portal) });
  const hub = projectPayload({ shortName: 'hub', isHub: true, parent: portal.id });
  await sails.helpers.addProject.with({ project: clone(hub) });
  await sails.helpers.addProject.with({ project: clone(hub) });

  const stored = await Project.findOne({ id: hub.id }).populate('parent');
  t.deepEqual(
    stored.parent.map((x) => x.id),
    [portal.id]
  );
  const parentSide = await Project.findOne({ id: portal.id }).populate('hubs');
  t.deepEqual(
    parentSide.hubs.map((x) => x.id),
    [hub.id]
  );
});

test('clusters are persisted', async (t) => {
  const p = projectPayload({ shortName: 'clusters' });
  await sails.helpers.addProject.with({ project: clone(p) });
  const stored = await Cluster.findOne({ id: p.clusters[0].id });
  t.is(stored.type, 'dockerCompose');
  t.is(String(stored.serverId), p.servers[0].id);
});
