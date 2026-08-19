const test = require('ava');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');

// Guards assets/dependencies.yaml (data, not code): a version-range edit there
// can silently make the UI demand an unsatisfiable dependency set. Regression
// for gh-6: '>=2.7.0' (no upper bound) matched biocache-service 3.9.0 too and
// dragged biocache-cli (solr < 8, java 8) into a 3.x stack that itself
// requires solr >= 8 / java 17.

const deps = yaml.load(
  fs.readFileSync(path.join(__dirname, '../assets/dependencies.yaml'), 'utf8')
);

// The frontend parses these ranges with Dart's pub_semver, which accepts
// spaces after operators ('>= 2.7.0 < 3.0.0'); node-semver does not.
const toNodeRange = (constraint) =>
  constraint === 'any' ? '*' : constraint.replace(/([<>]=?|\^|~)\s+/g, '$1');

// All dependency names required by `service` at `version`.
const requiredDeps = (service, version) => {
  const found = [];
  for (const [constraint, reqs] of Object.entries(deps[service])) {
    if (semver.satisfies(version, toNodeRange(constraint))) {
      for (const req of reqs) {
        found.push(...Object.keys(req));
      }
    }
  }
  return found;
};

test('biocache-service 3.x does not pull in biocache-cli', (t) => {
  for (const version of ['3.0.0', '3.7.0', '3.9.0']) {
    t.false(
      requiredDeps('biocache-service', version).includes('biocache-cli'),
      `biocache-service ${version} must not require biocache-cli`
    );
  }
});

test('biocache-service 2.7+ still pulls in biocache-cli', (t) => {
  for (const version of ['2.7.0', '2.7.5']) {
    t.true(
      requiredDeps('biocache-service', version).includes('biocache-cli'),
      `biocache-service ${version} must require biocache-cli`
    );
  }
});

test('no biocache-service version requires both biocache-cli and pipelines', (t) => {
  // The 2.x storage stack (biocache-cli -> solr < 8, java 8) and the 3.x one
  // (pipelines -> solr >= 8, java 17) are mutually exclusive by construction.
  const versions = ['2.5.0', '2.7.0', '2.9.9', '3.0.0', '3.1.2', '3.7.0', '3.9.0'];
  for (const version of versions) {
    const required = requiredDeps('biocache-service', version);
    t.false(
      required.includes('biocache-cli') && required.includes('pipelines'),
      `biocache-service ${version} resolves to an unsatisfiable set: ${required}`
    );
  }
});

test('every constraint in dependencies.yaml is parseable', (t) => {
  for (const [service, blocks] of Object.entries(deps)) {
    for (const constraint of Object.keys(blocks)) {
      const range = toNodeRange(constraint);
      t.truthy(
        semver.validRange(range),
        `${service}: unparseable constraint '${constraint}'`
      );
    }
  }
});
