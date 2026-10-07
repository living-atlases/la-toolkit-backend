const cp = require('child_process');
const fs = require('fs');

// The arguments a deploy passes to the generated ansiblew (or to ansible-playbook directly
// when useAnsiblew is false), from the DeployCmd the client sends. Shared by the Ansible
// deploy (helpers/ansible-ttyd.js) and the fast deploy (controllers/fast-deploy.js), which
// hands the very same ansiblew line to la-docker-compose's scripts/bundle/fast-deploy.sh.
const ansiblewArgs = (deployCmd, useAnsiblew, ansibleUser) => {
  let cmd = '';
  let aw = useAnsiblew;
  let sep = aw ? '=' : ' ';

  if (deployCmd.debug) {
    cmd = cmd + (aw ? ' --debug' : ' --vvvv');
  }
  if (deployCmd.onlyProperties) {
    cmd = cmd + (aw ? ' --properties' : ' --tags properties');
  }
  if (deployCmd.dryRun) {
    cmd = cmd + (aw ? '' : ' --check');
  }
  if (!deployCmd.dryRun) {
    cmd = cmd + (aw ? ' --nodryrun' : '');
  }
  if (deployCmd.continueEvenIfFails) {
    cmd = cmd + (aw ? ' --continue' : '');
  }
  if (deployCmd.tags.length > 0) {
    cmd = cmd + ` --tags${sep}${deployCmd.tags.join(',')}`;
  }
  if (deployCmd.skipTags.length > 0) {
    cmd =
      cmd +
      ` --skip${aw ? '' : '-tags'}${sep}${deployCmd.skipTags.join(',')}`;
  }
  if (deployCmd.limitToServers.length > 0) {
    cmd = cmd + ` --limit${sep}${deployCmd.limitToServers.join(',')}`;
  }

  // Docker-compose deploys: target la-docker-compose (site.yml against the
  // docker_compose group, all-in-one) instead of the per-service ala-install
  // playbooks. Granularity is a deny-list passed as skip_services.
  if (aw && deployCmd.dockerCompose) {
    cmd = cmd + ` --ladocker=/home/ubuntu/ansible/la-docker-compose`;
    let extra = 'auto_deploy=true';
    // Mirror the la-docker-compose Jenkinsfile SKIP_SERVICES default. The legacy `sds`
    // (sds-webapp2) and `sensitive-data-service` now deploy cleanly (sds data files repaired,
    // species category/zone refs normalized), so they are no longer deferred. Only
    // `sds-static-home` (next-gen static home) stays deferred. Tokens use the names
    // la-docker-compose recognises (inventory group / desc key), not the toolkit's internal names.
    const composeDeferred = ['sds-static-home'];
    const skips = [
      ...new Set([...(deployCmd.skipServices || []), ...composeDeferred]),
    ];
    if (skips.length > 0) {
      extra = `${extra} skip_services=${skips.join(',')}`;
    }
    cmd = cmd + ` --extra="${extra}"`;
  }

  cmd = cmd + ` --user ${ansibleUser}`;

  if (aw) {
    cmd = cmd + ` ${deployCmd.deployServices.join(' ')}`;
  }
  return cmd;
};

const ladockerDir = '/home/ubuntu/ansible/la-docker-compose';
const bundleCacheDir = '/home/ubuntu/ansible/la-inventories/.bundle-cache';
const fastDeployScript = `${ladockerDir}/scripts/bundle/fast-deploy.sh`;
const dockerSocket = '/var/run/docker.sock';

// The fast deploy line: la-docker-compose's fast-deploy.sh runs the project's ansiblew with
// these same arguments (recording, not running, the playbook) to render and apply bundles.
// What a bundle cannot do is refused here, before anything starts: a dry run, a partial
// deploy (tags, limit) and a non docker-compose line.
// Whether a path exists where the deploy commands run: the backend's own filesystem in
// production, the la-toolkit-dev container in development (preCmd is its docker exec).
const existsWhereCmdsRun = (preCmd, spawnSync = cp.spawnSync) => (path) =>
  preCmd
    ? spawnSync('sh', ['-c', `${preCmd} test -e ${path}`]).status === 0
    : fs.existsSync(path);

const fastDeployCmd = (deployCmd, ansibleUser, invPath, exists = fs.existsSync) => {
  // Off by default in the toolkit's docker-compose.yml: say how to turn it on, not a docker error.
  if (!exists(dockerSocket)) {
    throw new Error(
      'fast deploy is not enabled in this toolkit: it needs the host\'s docker socket. In the ' +
        'toolkit\'s docker-compose.yml, uncomment the /var/run/docker.sock volume of la-toolkit ' +
        'and restart it with DOCKER_GID=$(getent group docker | cut -d: -f3) docker compose up -d. ' +
        'The socket is root on that host and the toolkit has no login: only on a toolkit that is ' +
        'not exposed'
    );
  }
  if (!exists(fastDeployScript)) {
    throw new Error(
      'the selected la-docker-compose release has no fast deploy ' +
        '(scripts/bundle/fast-deploy.sh): pick a newer one in the project'
    );
  }
  if (!deployCmd.dockerCompose) {
    throw new Error('fast deploy is only for docker-compose deploys');
  }
  if (deployCmd.dryRun) {
    throw new Error('fast deploy has no dry run');
  }
  for (const k of ['tags', 'skipTags', 'limitToServers']) {
    if ((deployCmd[k] || []).length > 0) {
      throw new Error(`fast deploy always deploys the whole portal (no ${k})`);
    }
  }
  const args = ansiblewArgs(deployCmd, true, ansibleUser).trim();
  return `bash ${fastDeployScript} --inventory-dir ${invPath} ` +
    `--cache-dir ${bundleCacheDir} -- --alainstall=/home/ubuntu/ansible/ala-install ${args}`;
};

module.exports = {ansiblewArgs, fastDeployCmd, existsWhereCmdsRun, bundleCacheDir, dockerSocket};
