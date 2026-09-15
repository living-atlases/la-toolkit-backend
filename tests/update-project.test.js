const test = require('ava');
const sails = require('sails');
const { ObjectId } = require('mongodb');

// update-project must never create the rows of a project that does not exist
// (the create wizard PATCHing before Finish), and must never re-parent a row
// another project owns (a hub payload carrying one of the portal's clusters).

test.before(() => {
  return new Promise((resolve, reject) => {
    sails.lift(
      {
        hooks: { grunt: false },
        log: { level: 'warn' },
        port: 13372,
        // Own directory: ava runs files in parallel and `migrate: 'drop'` on a shared
        // .tmp/localDiskDb races with the other lifts.
        datastores: { default: { adapter: 'sails-disk', dir: '.tmp/localDiskDb-update-project' } },
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

function patch(project) {
  return new Promise((resolve, reject) => {
    sails.request(
      { method: 'PATCH', url: '/api/v1/update-project' },
      { project },
      (err, res, body) => (err ? reject(err) : resolve({ res, body }))
    );
  });
}

function payload(shortName, id = oid()) {
  const serverId = oid();
  return {
    id,
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
      { id: oid(), nameInt: 'ala_hub', use: true, iniPath: 'records', suburl: 'records', projectId: id },
    ],
    variables: [{ id: oid(), nameInt: 'ansible_user', service: 'all', value: 'ubuntu', projectId: id }],
    servers: [{ id: serverId, name: `vm-${shortName}`, ip: '10.0.0.1', projectId: id }],
    clusters: [{ id: oid(), name: 'compose', type: 'dockerCompose', projectId: id, serverId }],
    serviceDeploys: [],
  };
}

async function counts() {
  return {
    projects: await Project.count(),
    variables: await Variable.count(),
    services: await Service.count(),
    servers: await Server.count(),
    clusters: await Cluster.count(),
  };
}

test.serial('a PATCH for an unknown project creates nothing and answers 200', async (t) => {
  const before = await counts();
  const { res, body } = await patch(payload('ghost'));
  t.is(res.statusCode, 200);
  t.true(Array.isArray(body.projects));
  t.deepEqual(await counts(), before);
});

test.serial('a PATCH for an existing project upserts its children', async (t) => {
  const p = payload('real');
  await sails.helpers.addProject.with({ project: JSON.parse(JSON.stringify(p)) });

  const edited = JSON.parse(JSON.stringify(p));
  edited.longName = 'Renamed';
  edited.variables.push({ id: oid(), nameInt: 'favicon_url', service: 'all', value: 'y', projectId: p.id });
  edited.servers.push({ id: oid(), name: 'vm-real-2', ip: '10.0.0.2', projectId: p.id });
  const { res } = await patch(edited);
  t.is(res.statusCode, 200);

  t.is((await Project.findOne({ id: p.id })).longName, 'Renamed');
  t.is(await Variable.count({ projectId: p.id }), 2);
  t.is(await Server.count({ projectId: p.id }), 2);
});

test.serial('a PATCH never re-parents a cluster that belongs to another project', async (t) => {
  const portal = payload('owner');
  await sails.helpers.addProject.with({ project: JSON.parse(JSON.stringify(portal)) });
  const hub = payload('borrower');
  hub.isHub = true;
  await sails.helpers.addProject.with({ project: JSON.parse(JSON.stringify({ ...hub, parent: portal.id })) });

  // A stale client sends the portal's cluster and server inside the hub body,
  // stamped with the hub's projectId.
  const stolen = JSON.parse(JSON.stringify(hub));
  stolen.clusters.push({ ...portal.clusters[0], projectId: hub.id });
  stolen.servers.push({ ...portal.servers[0], projectId: hub.id });
  const { res } = await patch(stolen);
  t.is(res.statusCode, 200);

  t.is(String((await Cluster.findOne({ id: portal.clusters[0].id })).projectId), portal.id);
  t.is(String((await Server.findOne({ id: portal.servers[0].id })).projectId), portal.id);
  t.is(await Cluster.count({ projectId: portal.id }), 1);
});
