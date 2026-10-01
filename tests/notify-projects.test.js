const test = require('ava');
const sails = require('sails');
const { ObjectId } = require('mongodb');

// Every project change is pushed once to the `projects` room, whoever made it
// (a browser, the MCP over plain HTTP), and a socket that subscribes joins
// that room instead of per-record rooms frozen at subscription time.

const DELAY = 30;
let pushes = [];
let joins = [];

test.before(() => {
  return new Promise((resolve, reject) => {
    sails.lift(
      {
        hooks: { grunt: false },
        log: { level: 'warn' },
        port: 13376,
        // Own directory: ava runs files in parallel (see update-project.test.js).
        datastores: { default: { adapter: 'sails-disk', dir: '.tmp/localDiskDb-notify-projects' } },
        models: { migrate: 'drop' },
        custom: { notifyProjectsDelayMs: DELAY },
      },
      (err) => {
        if (err) {
          return reject(err);
        }
        sails.sockets.broadcast = (room, event, data) => pushes.push({ room, event, data });
        sails.sockets.join = (req, room) => joins.push({ req, room });
        resolve();
      }
    );
  });
});

test.after.always(() => {
  return new Promise((resolve, reject) => {
    sails.lower((err) => (err ? reject(err) : resolve()));
  });
});

test.beforeEach(() => {
  pushes = [];
  joins = [];
});

const oid = () => new ObjectId().toString();
const settle = () => new Promise((r) => setTimeout(r, DELAY * 4));

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    sails.request({ method, url }, body, (err, res, b) => (err ? reject(err) : resolve({ res, body: b })));
  });
}

function payload(shortName, id = oid()) {
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
    services: [],
    variables: [],
    servers: [],
    clusters: [],
    serviceDeploys: [],
  };
}

test.serial('a burst of changes sends one push with the last state', async (t) => {
  const { notifyProjects } = require('../api/libs/notify-projects');
  const p = payload('burst');
  await sails.helpers.addProject.with({ project: JSON.parse(JSON.stringify(p)) });
  notifyProjects();
  notifyProjects();
  await Project.updateOne({ id: p.id }).set({ longName: 'Last' });
  notifyProjects();
  await settle();

  t.is(pushes.length, 1);
  t.is(pushes[0].room, 'projects');
  t.is(pushes[0].event, 'project');
  t.is(pushes[0].data.find((x) => x.id === p.id).longName, 'Last');
});

test.serial('an HTTP save (the MCP) and a project created later are pushed', async (t) => {
  const created = payload('created');
  let r = await request('POST', '/api/v1/add-projects', { projects: [created] });
  t.is(r.res.statusCode, 200);
  await settle();
  t.is(pushes.length, 1);
  t.truthy(pushes[0].data.find((x) => x.id === created.id));

  pushes = [];
  r = await request('PATCH', '/api/v1/update-project', { project: { ...created, longName: 'Via MCP' } });
  t.is(r.res.statusCode, 200);
  await settle();
  t.is(pushes.length, 1);
  t.is(pushes[0].data.find((x) => x.id === created.id).longName, 'Via MCP');
});

test.serial('projects-subs joins the socket to the projects room', async (t) => {
  const action = require('../api/controllers/projects-subs');
  const req = { isSocket: true };
  await action.fn.call({ req }, {});
  t.is(joins.length, 1);
  t.is(joins[0].room, 'projects');
  t.is(joins[0].req, req);
});

test.serial('projects-subs refuses a plain HTTP request', async (t) => {
  const action = require('../api/controllers/projects-subs');
  // It throws a sails exit object, not an Error.
  let thrown = null;
  try {
    await action.fn.call({ req: { isSocket: false } }, {});
  } catch (e) {
    thrown = e;
  }
  t.truthy(thrown && thrown.badRequest);
  t.is(joins.length, 0);
});
