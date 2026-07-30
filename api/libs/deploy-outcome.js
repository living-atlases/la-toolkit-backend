const fs = require('fs');
const p = require('path');
const {
  exitCodeFile,
  resultsFile,
  logsProdDevLocation,
  logErr,
} = require('./utils.js');

// "Nobody ever found out." Not a failure — an open question. Anything that
// stores this as a verdict freezes a run that may well have succeeded.
const unknownExitCode = 100;

// Ansible's json callback appends `{...},\n` per play rather than writing a
// real array, so the file has to be closed into one. Missing is normal: it is
// only written at the play recap, so an interrupted or bash-only run has none.
// A run killed mid-write leaves it truncated; an empty summary beside the log
// beats throwing, since the log is the more useful half anyway.
const readAnsibleResults = (logsPrefix, logsSuffix) => {
  const path = p.join(
    logsProdDevLocation(),
    resultsFile(logsPrefix, logsSuffix)
  );
  if (!fs.existsSync(path)) {
    return [];
  }
  try {
    return JSON.parse('[' + fs.readFileSync(path, 'utf8').replace(/,\n$/, ']'));
  } catch (parseErr) {
    console.log(`Unparseable ansible results at ${path}, ignoring them`);
    logErr(parseErr);
    return [];
  }
};

const countFailures = (results) => {
  let failed = 0;
  for (const result of results) {
    const stats = result.stats || {};
    for (const host of Object.keys(stats)) {
      failed += (stats[host].failures || 0) + (stats[host].unreachable || 0);
    }
  }
  return failed;
};

// What ansible-playbook would have exited with, read off its own play recap: 2
// is its "some hosts failed" code, 0 a clean run. Only a rescue for runs that
// finished with nobody left to record the real code — never a substitute for
// it, and never applicable without a recap to read.
const ansibleExitCode = (results) => (countFailures(results) > 0 ? 2 : 0);

// The exit code the run recorded for itself, or `unknown` if it never got to.
const readExitCode = (logsPrefix, logsSuffix) => {
  const file = exitCodeFile(logsProdDevLocation(), logsPrefix, logsSuffix);
  if (!fs.existsSync(file)) {
    return unknownExitCode;
  }
  const read = fs.readFileSync(file, 'utf8');
  const code = parseInt(read, 10);
  return read === 'null' || Number.isNaN(code) ? unknownExitCode : code;
};

// The CmdHistoryEntry.result for an outcome. Mirrors the frontend's
// CmdHistoryDetails.result so the badge in the history and the verdict on the
// results page can't tell two different stories about the same run.
const cmdResultFor = (code, results) => {
  const failures = countFailures(results);
  if (code === 0 && failures === 0) {
    return 'success';
  }
  if (code === unknownExitCode) {
    return 'aborted';
  }
  return failures > 0 ? 'failed' : 'unknown';
};

module.exports = {
  unknownExitCode,
  readAnsibleResults,
  ansibleExitCode,
  readExitCode,
  cmdResultFor,
};
