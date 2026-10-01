const test = require('ava');
const sails = require('sails');
const { ObjectId } = require('mongodb');

// patch-project end to end: what two sessions change from the same copy is
// merged, and a real conflict writes nothing at all.

test.before(() => {
  return new Promise((resolve, reject) => {
    sails.lift(
      {
        hooks: { grunt: false },
        log: { level: 'warn' },
        port: 13374,
        // Own directory: ava runs files in parallel (see update-project.test.js).
        datastores: { default: { adapter: 'sails-disk', dir: '.tmp/localDiskDb-patch-project' } },
        models: { migrate: 'drop' },
        custom: { notifyProjectsDelayMs: 5 },
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

function send(patch) {
  return new Promise((resolve, reject) => {
    sails.request(
      { method: 'PATCH', url: '/api/v1/patch-project' },
      { patch },
      (err, res, body) => {
        // sails.request reports a non-2xx answer as err, carrying the response.
        if (err && err.status) {
          return resolve({ status: err.status, body: err.body });
        }
        return err ? reject(err) : resolve({ status: res.statusCode, body });
      }
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
    services: [{ id: oid(), nameInt: 'collectory', use: true, iniPath: '', suburl: 'collectory', projectId: id }],
    variables: [
      { id: oid(), nameInt: 'x', service: 'all', value: 'a', projectId: id },
      { id: oid(), nameInt: 'y', service: 'all', value: 'a', projectId: id },
    ],
    servers: [{ id: serverId, name: `vm-${shortName}`, ip: '10.0.0.1', projectId: id }],
    clusters: [{ id: oid(), name: 'compose', type: 'dockerCompose', projectId: id, serverId }],
    serviceDeploys: [],
  };
}

async function add(p) {
  await sails.helpers.addProject.with({ project: JSON.parse(JSON.stringify(p)) });
  return p;
}

const setVar = (p, i, from, to) => ({
  projectId: p.id,
  rows: { variables: { update: [{ id: p.variables[i].id, set: { value: { from, to } } }] } },
});

test.serial('two sessions changing different variables from the same copy both land', async (t) => {
  const p = await add(payload('disjoint'));
  const [a, b] = await Promise.all([send(setVar(p, 0, 'a', 'x2')), send(setVar(p, 1, 'a', 'y2'))]);
  t.is(a.status, 200);
  t.is(b.status, 200);
  t.is((await Variable.findOne({ id: p.variables[0].id })).value, 'x2');
  t.is((await Variable.findOne({ id: p.variables[1].id })).value, 'y2');
});

test.serial('the same field changed twice: the second answers 409 and writes nothing', async (t) => {
  const p = await add(payload('same'));
  t.is((await send(setVar(p, 0, 'a', 'first'))).status, 200);

  const second = setVar(p, 0, 'a', 'second');
  second.project = { longName: { from: p.longName, to: 'Should not land' } };
  const r = await send(second);
  t.is(r.status, 409, JSON.stringify(r.body && r.body.conflicts));
  t.deepEqual(r.body.conflicts, [`variables/${p.variables[0].id}.value`]);
  t.true(Array.isArray(r.body.projects));
  t.is((await Variable.findOne({ id: p.variables[0].id })).value, 'first');
  t.is((await Project.findOne({ id: p.id })).longName, p.longName);
});

test.serial('deleting a server another session just used conflicts and keeps it', async (t) => {
  const p = await add(payload('inuse'));
  const server = p.servers[0];
  const assign = {
    projectId: p.id,
    rows: { serviceDeploys: { create: [
      { id: oid(), serviceId: p.services[0].id, serverId: server.id, type: 'vm', projectId: p.id },
    ] } },
  };
  t.is((await send(assign)).status, 200);

  const r = await send({ projectId: p.id, rows: { servers: { remove: [server.id] } } });
  t.is(r.status, 409);
  t.deepEqual(r.body.conflicts, [`servers/${server.id}`]);
  t.truthy(await Server.findOne({ id: server.id }));
});

test.serial('a row nobody mentions is never deleted', async (t) => {
  const p = await add(payload('untouched'));
  t.is((await send(setVar(p, 0, 'a', 'b'))).status, 200);
  t.is(await Server.count({ projectId: p.id }), 1);
  t.is(await Cluster.count({ projectId: p.id }), 1);
  t.is(await Variable.count({ projectId: p.id }), 2);
});

test.serial('the same defaulted variable created by two clients is one row', async (t) => {
  const p = await add(payload('twice'));
  const create = (id) => ({
    projectId: p.id,
    rows: { variables: { create: [{ id, nameInt: 'ansible_user', service: 'all', value: 'ubuntu', projectId: p.id }] } },
  });
  const [a, b] = await Promise.all([send(create(oid())), send(create(oid()))]);
  t.is(a.status, 200);
  t.is(b.status, 200);
  t.is(await Variable.count({ projectId: p.id, nameInt: 'ansible_user' }), 1);
});

test.serial('a hub placing a service on its portal cluster is not a conflict', async (t) => {
  const portal = await add(payload('portal'));
  const hub = payload('hub');
  hub.isHub = true;
  await add({ ...hub, parent: portal.id });
  const r = await send({
    projectId: hub.id,
    rows: {
      serviceDeploys: { create: [{
        id: oid(), serviceId: hub.services[0].id, clusterId: portal.clusters[0].id,
        serverId: portal.servers[0].id, type: 'dockerCompose', projectId: hub.id,
      }] },
      // A stale hub body carrying the portal's cluster: ignored, not re-parented.
      clusters: { create: [{ ...portal.clusters[0], projectId: portal.id }] },
    },
  });
  t.is(r.status, 200, JSON.stringify(r.body && r.body.conflicts));
  t.is(await ServiceDeploy.count({ projectId: hub.id }), 1);
  t.is(String((await Cluster.findOne({ id: portal.clusters[0].id })).projectId), portal.id);
});

test.serial('an unknown project answers 404', async (t) => {
  const r = await send({ projectId: oid(), rows: {} });
  t.is(r.status, 404);
});
