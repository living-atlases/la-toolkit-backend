const test = require('ava');

const {ansiblewArgs, fastDeployCmd, existsWhereCmdsRun, bundleCacheDir, dockerSocket} = require('../api/libs/ansiblew-args.js');

const base = {
  debug: false, onlyProperties: false, dryRun: false, continueEvenIfFails: false,
  tags: [], skipTags: [], limitToServers: [], deployServices: ['all'],
  skipServices: [], dockerCompose: true,
};

test('ansiblewArgs builds the docker-compose deploy line', (t) => {
  t.is(
    ansiblewArgs({...base, skipServices: ['alerts']}, true, 'ubuntu'),
    ' --nodryrun --ladocker=/home/ubuntu/ansible/la-docker-compose' +
      ' --extra="auto_deploy=true skip_services=alerts,sds-static-home" --user ubuntu all'
  );
});

test('ansiblewArgs keeps the plain ansible-playbook form', (t) => {
  t.is(
    ansiblewArgs({...base, dockerCompose: false, dryRun: true, tags: ['a'], limitToServers: ['h1']}, false, 'u'),
    ' --check --tags a --limit h1 --user u'
  );
});

test('fastDeployCmd hands ansiblew\'s own line to fast-deploy.sh', (t) => {
  const cmd = fastDeployCmd(base, 'ubuntu', '/inv/p/p-inventories/', () => true);
  t.is(
    cmd,
    'bash /home/ubuntu/ansible/la-docker-compose/scripts/bundle/fast-deploy.sh' +
      ` --inventory-dir /inv/p/p-inventories/ --cache-dir ${bundleCacheDir}` +
      ' -- --alainstall=/home/ubuntu/ansible/ala-install' +
      ' --nodryrun --ladocker=/home/ubuntu/ansible/la-docker-compose' +
      ' --extra="auto_deploy=true skip_services=sds-static-home" --user ubuntu all'
  );
});

test('fastDeployCmd refuses what a bundle cannot do', (t) => {
  for (const bad of [
    {dockerCompose: false}, {dryRun: true}, {tags: ['x']}, {skipTags: ['x']}, {limitToServers: ['h']},
  ]) {
    t.throws(() => fastDeployCmd({...base, ...bad}, 'u', '/inv/', () => true), undefined, JSON.stringify(bad));
  }
});

test('fastDeployCmd refuses a la-docker-compose release without fast-deploy.sh', (t) => {
  const e = t.throws(() => fastDeployCmd(base, 'u', '/inv/', (f) => f === dockerSocket));
  t.regex(e.message, /no fast deploy/);
});

test('fastDeployCmd without the docker socket says how to enable it', (t) => {
  const e = t.throws(() => fastDeployCmd(base, 'u', '/inv/', (f) => f !== dockerSocket));
  t.regex(e.message, /not enabled in this toolkit/);
  t.regex(e.message, /uncomment the \/var\/run\/docker\.sock volume/);
  t.regex(e.message, /DOCKER_GID=\$\(getent group docker/);
});

test('existsWhereCmdsRun checks inside the container when the commands run there (dev)', (t) => {
  const calls = [];
  const spawn = (cmd, args) => {
    calls.push(args[1]);
    return {status: args[1].endsWith('/yes') ? 0 : 1};
  };
  const exists = existsWhereCmdsRun('docker exec -u ubuntu la-toolkit-dev', spawn);
  t.true(exists('/yes'));
  t.false(exists('/no'));
  t.deepEqual(calls, [
    'docker exec -u ubuntu la-toolkit-dev test -e /yes',
    'docker exec -u ubuntu la-toolkit-dev test -e /no',
  ]);
});

test('existsWhereCmdsRun checks its own filesystem without a preCmd (production)', (t) => {
  const exists = existsWhereCmdsRun('', () => t.fail('no exec in production'));
  t.true(exists(__filename));
  t.false(exists('/no/such/path/fast-deploy.sh'));
});
