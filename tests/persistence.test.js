const test = require('ava');
const sails = require('sails');
const transform = require('../api/libs/transform.js');

test.before((t) => {
  return new Promise((resolve, reject) => {
    sails.lift(
      {
        hooks: { grunt: false },
        log: { level: 'warn' },
        port: 13371, // Different port from main test to avoid conflicts if running in parallel
        datastores: {
          default: {
            adapter: 'sails-disk',
          },
        },
        models: {
          migrate: 'drop',
        },
      },
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
});

test.after.always((t) => {
  return new Promise((resolve, reject) => {
    sails.lower((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
});

test('Project persistence: should not duplicate cluster services in server services', async (t) => {
  let project;

  t.teardown(async () => {
    if (project) {
      await ServiceDeploy.destroy({ projectId: project.id });
      await Service.destroy({ projectId: project.id });
      await Cluster.destroy({ projectId: project.id });
      await Server.destroy({ projectId: project.id });
      await Project.destroy({ id: project.id });
    }
  });

  // 1. Create a Project
  project = await Project.create({
    longName: 'Test Project',
    shortName: 'test-p',
    domain: 'test.org',
    theme: 'clean',
    mapBoundsFstPoint: { lat: 0, lng: 0 },
    mapBoundsSndPoint: { lat: 10, lng: 10 },
    additionalVariables: '',
    genConf: {},
  }).fetch();

  // 2. Create a Server
  const server = await Server.create({
    name: 'vm1',
    ip: '127.0.0.1',
    projectId: project.id,
  }).fetch();

  // 3. Create a Cluster (Docker Compose) assigned to the server
  const cluster = await Cluster.create({
    name: 'compose-cluster',
    type: 'dockerCompose',
    projectId: project.id,
    serverId: server.id,
  }).fetch();

  // 4. Create Services
  const collectoryService = await Service.create({
    nameInt: 'collectory',
    projectId: project.id,
    iniPath: 'collections',
    suburl: 'collections',
  }).fetch();

  const gatusService = await Service.create({
    nameInt: 'gatus',
    projectId: project.id,
    iniPath: '',
    suburl: '',
  }).fetch();

  // 5. Create Service Deploys
  // Collectory deployed DIRECTLY on the VM
  await ServiceDeploy.create({
    projectId: project.id,
    serverId: server.id,
    serviceId: collectoryService.id,
    status: 'success',
  });

  // Gatus deployed in the Cluster (Docker Compose) on the VM
  await ServiceDeploy.create({
    projectId: project.id,
    serverId: server.id,
    clusterId: cluster.id,
    serviceId: gatusService.id,
    status: 'success',
  });

  // 6. Call populate-project helper
  // We simulate the query used in get-conf
  const populatedProjects = await sails.helpers.populateProject({
    id: project.id,
  });
  const p = populatedProjects[0];

  t.truthy(p, 'Project should be retrieved');

  // 7. Verify Assigments
  const serverServices = p.serverServices[server.id];
  const clusterServices = p.clusterServices[cluster.id];

  t.true(
    serverServices.includes('collectory'),
    'Collectory should be in server services'
  );
  t.false(
    serverServices.includes('gatus'),
    'Gatus (cluster service) should NOT be in server services'
  );

  t.truthy(clusterServices, 'Cluster services should exist');
  t.true(
    clusterServices.includes('gatus'),
    'Gatus should be in cluster services'
  );
});
