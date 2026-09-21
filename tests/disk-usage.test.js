const test = require('ava');

const {dfCommand, parseDf, diskUsage, maxParallel} = require('../api/libs/disk-usage.js');

const df = `Filesystem     1024-blocks     Used Available Capacity Mounted on
/dev/sda1         30308240 21000000   8000000      73% /
/dev/sda1         30308240 21000000   8000000      73% /
/dev/sdb1        103081248 10000000  93081248      10% /data
`;

test('parseDf reports each filesystem once, in GB, flagging low space', (t) => {
  const fs = parseDf(df);
  t.is(fs.length, 2);
  t.deepEqual(fs[0], {filesystem: '/dev/sda1', mount: '/', sizeGB: 28.9, availableGB: 7.6, usePct: 73, low: true});
  t.false(fs[1].low);
  t.is(fs[1].mount, '/data');
});

test('parseDf flags a nearly full disk even with GBs left', (t) => {
  const fs = parseDf('h\n/dev/x 1048576000 990000000 58576000 95% /\n');
  t.true(fs[0].low);
});

test('parseDf ignores garbage', (t) => {
  t.deepEqual(parseDf(''), []);
  t.deepEqual(parseDf('Filesystem\nsome banner line\n'), []);
});

test('dfCommand prefixes preCmd and refuses unsafe names', (t) => {
  const cmd = dfCommand('docker exec -u ubuntu la-toolkit-dev', 'la-1.example.org');
  t.true(cmd.startsWith('docker exec -u ubuntu la-toolkit-dev ssh -T -o BatchMode=yes'));
  t.true(cmd.includes(' la-1.example.org \'df -P -k / /data /var/lib/docker'));
  t.is(dfCommand('', 'h').indexOf('ssh'), 0);
  for (const bad of ['a;id', 'a b', '$(id)', '-oProxyCommand=x', 'a,b']) {
    t.throws(() => dfCommand('', bad), undefined, bad);
  }
});

test('diskUsage keeps going when one server fails', async (t) => {
  const exec = async (cmd) => {
    if (cmd.includes(' bad ')) {
      const e = new Error('Command failed');
      e.stderr = 'ssh: connect to host bad port 22: Connection timed out\n';
      throw e;
    }
    return {stdout: df, stderr: ''};
  };
  const r = await diskUsage({
    servers: [{name: 'good'}, {name: 'bad'}, {name: 'a;id'}],
    exec,
    config: {preCmd: '', sshDir: '/tmp'},
  });
  t.is(r[0].name, 'good');
  t.true(r[0].ok);
  t.true(r[0].low);
  t.deepEqual(r[1], {name: 'bad', ok: false, error: 'ssh: connect to host bad port 22: Connection timed out'});
  t.false(r[2].ok);
  t.regex(r[2].error, /unsafe/);
});

test('diskUsage never opens more than maxParallel sessions, and keeps order', async (t) => {
  let open = 0;
  let peak = 0;
  const exec = async () => {
    open++;
    peak = Math.max(peak, open);
    await new Promise((r) => setTimeout(r, 5));
    open--;
    return {stdout: df, stderr: ''};
  };
  const servers = Array.from({length: 12}, (_, i) => ({name: `h${i}`}));
  const r = await diskUsage({servers, exec, config: {preCmd: '', sshDir: '/tmp'}});
  t.is(peak, maxParallel);
  t.deepEqual(r.map((s) => s.name), servers.map((s) => s.name));
});
