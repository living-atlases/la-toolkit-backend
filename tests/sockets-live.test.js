const test = require('ava');
const sails = require('sails');
const http = require('http');
const { ObjectId } = require('mongodb');
const io = require('socket.io-client');

// The real path a browser takes, without stubs: a socket.io client (as the
// Flutter sails_io one: websocket transport, sails SDK query) subscribes
// through projects-subs, a plain HTTP save (as the MCP does) changes a
// project, and the 'project' event reaches the socket. Then the socket
// reconnects and subscribes again, as main.dart does in onConnect.

const PORT = 13378;

test.before(() => {
  return new Promise((resolve, reject) => {
    sails.lift(
      {
        hooks: { grunt: false },
        log: { level: 'warn' },
        port: PORT,
        // Own directory: ava runs files in parallel (see update-project.test.js).
        datastores: { default: { adapter: 'sails-disk', dir: '.tmp/localDiskDb-sockets-live' } },
        models: { migrate: 'drop' },
        custom: { notifyProjectsDelayMs: 20 },
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

function connect() {
  return io(`http://localhost:${PORT}`, {
    transports: ['websocket'],
    query: '__sails_io_sdk_version=0.11.0',
    extraHeaders: { origin: 'http://localhost' },
    reconnection: false,
  });
}

// What sails.io.js does for io.socket.get(url).
function socketGet(socket, url) {
  return new Promise((resolve) => {
    socket.emit('get', { method: 'get', url, headers: {}, data: {} }, (res) => resolve(res));
  });
}

function httpJson(method, path, body) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: 'localhost', port: PORT, path, method, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let out = '';
        res.on('data', (c) => {
          out += c;
        });
        res.on('end', () => resolve({ status: res.statusCode, body: out }));
      }
    );
    req.on('error', reject);
    req.end(data);
  });
}

const nextEvent = (socket, event, ms = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no '${event}' in ${ms} ms`)), ms);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

function payload(shortName, id = oid()) {
  return {
    id, longName: `Project ${shortName}`, shortName, dirName: shortName, domain: `${shortName}.org`,
    theme: 'clean', mapBoundsFstPoint: { lat: 0, lng: 0 }, mapBoundsSndPoint: { lat: 10, lng: 10 },
    additionalVariables: '', genConf: {}, services: [], variables: [], servers: [], clusters: [], serviceDeploys: [],
  };
}

test.serial('an HTTP change reaches a subscribed socket, also after it reconnects', async (t) => {
  let socket = connect();
  await nextEvent(socket, 'connect');
  const sub = await socketGet(socket, '/api/v1/projects-subs');
  t.is(sub.statusCode, 200);

  // Created after the socket subscribed: per-record rooms never heard of it.
  const p = payload('live');
  let pushed = nextEvent(socket, 'project');
  t.is((await httpJson('POST', '/api/v1/add-projects', { projects: [p] })).status, 200);
  t.truthy((await pushed).find((x) => x.id === p.id));

  socket.close();
  socket = connect();
  await nextEvent(socket, 'connect');
  t.is((await socketGet(socket, '/api/v1/projects-subs')).statusCode, 200);

  pushed = nextEvent(socket, 'project');
  const r = await httpJson('PATCH', '/api/v1/patch-project', {
    patch: { projectId: p.id, project: { longName: { from: p.longName, to: 'Changed by the MCP' } } },
  });
  t.is(r.status, 200);
  t.is((await pushed).find((x) => x.id === p.id).longName, 'Changed by the MCP');
  socket.close();
});

test.serial('a socket that did not subscribe hears nothing', async (t) => {
  const socket = connect();
  await nextEvent(socket, 'connect');
  const p = payload('silent');
  const pushed = nextEvent(socket, 'project', 500).then(() => 'pushed', () => 'nothing');
  t.is((await httpJson('POST', '/api/v1/add-projects', { projects: [p] })).status, 200);
  t.is(await pushed, 'nothing');
  socket.close();
});

function socketPost(socket, url, data) {
  return new Promise((resolve) => {
    socket.emit('post', { method: 'post', url, headers: {}, data }, (res) => resolve(res));
  });
}

test.serial('presence: others see which project a browser has open, until it closes', async (t) => {
  const a = connect();
  const b = connect();
  await Promise.all([nextEvent(a, 'connect'), nextEvent(b, 'connect')]);
  await socketGet(a, '/api/v1/projects-subs');
  await socketGet(b, '/api/v1/projects-subs');

  let seen = nextEvent(b, 'presence');
  const r = await socketPost(a, '/api/v1/presence', { projectId: 'p1', mode: 'edit' });
  t.is(r.statusCode, 200);
  t.deepEqual(await seen, [{ id: a.id, projectId: 'p1', mode: 'edit' }]);

  seen = nextEvent(b, 'presence');
  a.close();
  t.deepEqual(await seen, []);
  b.close();
});
