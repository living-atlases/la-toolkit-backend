const test = require('ava');
const fs = require('fs');
const path = require('path');

const {asshReConfig} = require('../api/libs/assh.js');

// Regression for gh-7: ~/.ssh/config was never built after generating the assh
// YAMLs, so terminals died with EIO until a connectivity check happened to run.

test('asshReConfig builds ~/.ssh/config from the assh YAMLs', async (t) => {
  const calls = [];
  const fakeExec = async (cmd, opts) => {
    calls.push({cmd, opts});
    return {stdout: '', stderr: ''};
  };

  const result = await asshReConfig({
    exec: fakeExec,
    config: {preCmd: '', sshDir: '/var/tmp/la-toolkit/.ssh/'},
  });

  t.is(result, '');
  t.is(calls.length, 1);
  t.true(calls[0].cmd.includes('assh config build'));
  t.true(calls[0].cmd.includes('> /home/ubuntu/.ssh/config'));
  t.is(calls[0].opts.cwd, '/var/tmp/la-toolkit/.ssh/');
});

test('asshReConfig prefixes preCmd when configured', async (t) => {
  const calls = [];
  const fakeExec = async (cmd) => {
    calls.push(cmd);
    return {stdout: '', stderr: ''};
  };

  await asshReConfig({
    exec: fakeExec,
    config: {preCmd: 'docker exec -u ubuntu la-toolkit', sshDir: '/tmp'},
  });

  t.true(calls[0].startsWith('docker exec -u ubuntu la-toolkit '));
});

test('asshReConfig returns the error message instead of throwing', async (t) => {
  const failingExec = async () => {
    throw new Error('assh not found');
  };

  const result = await asshReConfig({
    exec: failingExec,
    config: {preCmd: '', sshDir: '/tmp'},
  });

  t.is(result, 'assh not found');
});

test('gen-ssh-conf invokes asshReConfig after writing the assh YAMLs', (t) => {
  // The controller needs a lifted sails app to run, so pin the wiring at the
  // source level: the call must exist and must not be the old commented-out
  // reminder (`// assh config build > ~/.ssh/config`).
  const src = fs.readFileSync(
    path.join(__dirname, '../api/controllers/gen-ssh-conf.js'),
    'utf8'
  );
  t.regex(src, /require\('\.\.\/libs\/assh\.js'\)/);
  t.regex(src, /^\s*await asshReConfig\(\);/m);
});
