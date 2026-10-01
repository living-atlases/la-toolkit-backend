const test = require('ava');

const {ansiblewArgs, fastDeployCmd, bundleCacheDir} = require('../api/libs/ansiblew-args.js');

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
  const cmd = fastDeployCmd(base, 'ubuntu', '/inv/p/p-inventories/');
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
    t.throws(() => fastDeployCmd({...base, ...bad}, 'u', '/inv/'), undefined, JSON.stringify(bad));
  }
});
