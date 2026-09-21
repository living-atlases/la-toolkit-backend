const util = require('util');
const cp = require('child_process');

// Free space on the servers of a project, read over ssh with `df`.
//
// A disk that fills up mid-deploy looks like a deploy failure (images that
// never finish pulling, containers that die writing logs) and has already
// taken production down once, so it is checked before deploying, not after.

// Mounts that matter for an LA deploy: the root volume, the usual data
// volume and docker's storage (images and container logs). Missing ones are
// simply not reported; the same filesystem is only reported once.
const mounts = ['/', '/data', '/var/lib/docker'];

// Below either threshold a deploy is likely to run out of space: pulling the
// compose images alone takes several GB.
const lowAvailableKb = 10 * 1024 * 1024;
const highUsePct = 90;

// Server names go into a shell command line, so only plain host names pass.
// (LARegExp.hostnameRegexp in regexp.js also allows spaces and commas.)
const safeHost = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const dfCommand = (preCmd, host) => {
  if (!safeHost.test(host)) {
    throw new Error(`Refusing unsafe server name "${host}"`);
  }
  const pre = preCmd ? `${preCmd} ` : '';
  // `; true`: df exits non-zero when one of the paths does not exist, but it
  // still prints the others.
  return `${pre}ssh -T -o BatchMode=yes -o ConnectTimeout=10 ${host} 'df -P -k ${mounts.join(' ')} 2>/dev/null; true'`;
};

// `df -P -k` output -> [{filesystem, mount, sizeGB, availableGB, usePct, low}]
const parseDf = (stdout) => {
  const seen = new Set();
  const out = [];
  for (const line of (stdout || '').split('\n').slice(1)) {
    const f = line.trim().split(/\s+/);
    if (f.length < 6 || !/^\d+$/.test(f[1])) {continue;}
    const [filesystem, size, , avail, capacity] = f;
    if (seen.has(filesystem)) {continue;}
    seen.add(filesystem);
    const usePct = parseInt(capacity, 10);
    const availKb = parseInt(avail, 10);
    out.push({
      filesystem,
      mount: f.slice(5).join(' '),
      sizeGB: Math.round(parseInt(size, 10) / 1048576 * 10) / 10,
      availableGB: Math.round(availKb / 1048576 * 10) / 10,
      usePct,
      low: availKb < lowAvailableKb || usePct >= highUsePct,
    });
  }
  return out;
};

// At most this many ssh sessions at once: servers behind the same gateway
// all open their connection through it, and sshd drops unauthenticated
// connections beyond MaxStartups (10 by default).
const maxParallel = 5;

const checkServer = async (server, exec, config) => {
  try {
    const {stdout} = await exec(dfCommand(config.preCmd, server.name), {
      cwd: config.sshDir,
      shell: '/bin/bash',
      timeout: 30000,
    });
    const filesystems = parseDf(stdout);
    if (filesystems.length === 0) {
      return {name: server.name, ok: false, error: 'df printed nothing'};
    }
    return {name: server.name, ok: true, low: filesystems.some((fs) => fs.low), filesystems};
  } catch (e) {
    return {name: server.name, ok: false, error: (e.stderr || e.message || String(e)).trim()};
  }
};

// servers: [{name}]. Results keep the order of servers. exec/config are
// injectable for tests.
const diskUsage = async ({servers, exec = util.promisify(cp.exec), config}) => {
  const results = new Array(servers.length);
  let next = 0;
  const worker = async () => {
    while (next < servers.length) {
      const i = next++;
      results[i] = await checkServer(servers[i], exec, config);
    }
  };
  await Promise.all(Array.from({length: Math.min(maxParallel, servers.length)}, worker));
  return results;
};

module.exports = {dfCommand, parseDf, diskUsage, maxParallel, lowAvailableKb, highUsePct};
