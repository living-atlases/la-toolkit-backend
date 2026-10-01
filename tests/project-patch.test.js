const test = require('ava');
const fs = require('fs');
const path = require('path');
const { mergePatch, applyWrites, eq } = require('../api/libs/project-patch.js');

// The merge rules, shared with la_toolkit_core (test/fixtures/patch_merge):
// the server and the client rebase must agree on every case.

const dir = path.join(__dirname, 'fixtures', 'patch_merge');

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const c = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  test(`${file}: ${c.description}`, (t) => {
    const { conflicts, writes } = mergePatch(c.current, c.patch, { foreignIds: c.foreignIds || [] });
    t.deepEqual(conflicts, [...c.conflicts].sort());
    if (c.result) {
      const result = applyWrites(c.current, writes);
      t.true(eq(result, c.result), JSON.stringify(result, null, 1));
    }
  });
}

test('eq treats a missing key and null alike, but not an empty string', (t) => {
  t.true(eq({ a: 1 }, { a: 1, b: null }));
  t.false(eq({ a: 1, b: '' }, { a: 1 }));
  t.true(eq([{ x: [1, 2] }], [{ x: [1, 2] }]));
  t.false(eq([1, 2], [2, 1]));
});
