// Field-level merge of a project change against what is stored now.
//
// A client (a browser, the MCP) sends what it changed since the copy it last
// read (`ProjectPatch.diff` in la_toolkit_core), not the whole project, so
// two sessions touching different things do not step on each other, and a
// row nobody mentioned is never deleted. Only the same field changed on both
// sides, a row edited here and deleted there, or a reference to a row that is
// gone is a conflict; then nothing is written.
//
// Pure functions over plain JSON: the Dart side (packages/la_toolkit_core,
// lib/models/project_patch.dart) implements the same rules and both run the
// fixtures in tests/fixtures/patch_merge (copied from la_toolkit, keep them
// in sync).
//
// patch = {
//   projectId,
//   project: { field: {from, to} },          // project row fields
//   derived: { genConf },                    // recomputed by clients: last wins
//   rows: { servers|clusters|services|serviceDeploys|variables: {
//     create: [row], update: [{id, set: {field: {from, to}}}], remove: [id] } },
// }
// writes = { project: {field: value},
//            rows: { collection: {create: [row], update: [{id, set: {field: value}}], remove: [id]} } }

const PROJECT_FIELDS = [
  'longName', 'shortName', 'dirName', 'domain', 'useSSL', 'isHub', 'theme',
  'mapZoom', 'mapBoundsFstPoint', 'mapBoundsSndPoint', 'additionalVariables',
  'alaInstallRelease', 'generatorRelease', 'dockerComposeRelease', 'status',
  'isCreated', 'fstDeployed', 'advancedEdit', 'advancedTune', 'clientMigration',
];
// Progress flags any session may move forward: last write wins.
const PROJECT_SOFT = ['status', 'isCreated', 'fstDeployed', 'clientMigration'];
const DERIVED = ['genConf'];

const COLLECTIONS = ['servers', 'clusters', 'services', 'serviceDeploys', 'variables'];
const ROW_META = ['id', 'projectId', 'createdAt', 'updatedAt'];
// Written by checks (connectivity, service status), not by people.
const ROW_SOFT = {
  servers: ['reachable', 'sshReachable', 'sudoEnabled', 'osName', 'osVersion'],
  clusters: [],
  services: ['status'],
  serviceDeploys: ['status', 'checkedAt'],
  variables: [],
};
// Two sessions creating "the same" row give it different ids: a defaulted
// variable materialised by both, the same service assigned to the same server.
const NATURAL_KEYS = {
  servers: ['name'],
  clusters: [],
  services: ['nameInt'],
  serviceDeploys: ['serviceId', 'serverId', 'clusterId'],
  variables: ['nameInt'],
};
const REFS = {
  clusters: { serverId: 'servers' },
  serviceDeploys: { serviceId: 'services', serverId: 'servers', clusterId: 'clusters' },
};

const isBlank = (v) => v === undefined || v === null;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// Deep equality where a missing key and null are the same (old Mongo rows
// lack keys the client sends as null).
function eq(a, b) {
  if (isBlank(a) || isBlank(b)) {
    return isBlank(a) && isBlank(b);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => eq(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!eq(a[k], b[k])) {
        return false;
      }
    }
    return true;
  }
  return a === b;
}

// Whether what is stored still is the `from` the client saw. A key the
// stored object lacks, and stored sub-keys the client does not know (an
// sshKey saved with an old `fingerprint`), are not changes made by anyone:
// they would make every edit of that field conflict on old rows.
function matchesFrom(stored, present, from) {
  if (!present) {
    return true;
  }
  if (isPlainObject(stored) && isPlainObject(from)) {
    return Object.keys(from).every((k) => matchesFrom(stored[k], Object.prototype.hasOwnProperty.call(stored, k), from[k]));
  }
  return eq(stored, from);
}

// Whether a stored row already says what a created one says. Only the
// client's own fields count: a stored row also carries model defaults the
// client never sends (Variable.status).
function sameRow(collection, stored, created) {
  return Object.entries(content(collection, created)).every(([k, v]) => eq(stored[k], v));
}

function content(collection, row) {
  const skip = new Set([...ROW_META, ...ROW_SOFT[collection]]);
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (!skip.has(k)) {
      out[k] = v;
    }
  }
  return out;
}

function mergePatch(current, patch, opts = {}) {
  const foreignIds = new Set((opts.foreignIds || []).map(String));
  const conflicts = [];
  const writes = { project: {}, rows: {} };
  const pid = String(current.id);

  for (const [f, change] of Object.entries(patch.project || {})) {
    if (!PROJECT_FIELDS.includes(f)) {
      continue;
    }
    const cur = current[f];
    if (eq(cur, change.to)) {
      continue;
    }
    if (PROJECT_SOFT.includes(f) || matchesFrom(cur, has(current, f), change.from)) {
      writes.project[f] = change.to;
    } else {
      conflicts.push(`project.${f}`);
    }
  }
  for (const f of DERIVED) {
    const derived = patch.derived || {};
    if (Object.prototype.hasOwnProperty.call(derived, f) && !eq(current[f], derived[f])) {
      writes.project[f] = derived[f];
    }
  }

  const byId = {};
  const removed = {};
  for (const c of COLLECTIONS) {
    byId[c] = new Map((current[c] || []).map((r) => [String(r.id), r]));
    const ops = (patch.rows || {})[c] || {};
    removed[c] = new Set((ops.remove || []).map(String).filter((id) => byId[c].has(id)));
  }

  const touched = [];
  for (const c of COLLECTIONS) {
    const ops = (patch.rows || {})[c] || {};
    const w = { create: [], update: [], remove: [...removed[c]] };

    for (const row of ops.create || []) {
      const id = String(row.id);
      if (!isBlank(row.projectId) && String(row.projectId) !== pid) {
        continue; // another project's row (a hub carrying its portal's cluster)
      }
      const existing = byId[c].get(id);
      if (existing) {
        if (!sameRow(c, existing, row)) {
          conflicts.push(`${c}/${id}`);
        }
        continue;
      }
      const keys = NATURAL_KEYS[c];
      const twin = keys.length === 0 ? null : (current[c] || []).find(
        (r) => !removed[c].has(String(r.id)) && keys.every((k) => eq(r[k], row[k]))
      );
      if (twin) {
        if (!sameRow(c, twin, row)) {
          conflicts.push(`${c}/${id}`);
        }
        continue;
      }
      w.create.push(row);
      touched.push([c, row]);
    }

    for (const u of ops.update || []) {
      const id = String(u.id);
      const existing = byId[c].get(id);
      const set = {};
      const fields = Object.keys(u.set || {}).filter((f) => !ROW_META.includes(f));
      if (!existing || removed[c].has(id)) {
        if (fields.some((f) => !ROW_SOFT[c].includes(f))) {
          conflicts.push(`${c}/${id}`); // edited here, deleted elsewhere
        }
        continue;
      }
      for (const f of fields) {
        const change = u.set[f];
        const cur = existing[f];
        if (eq(cur, change.to)) {
          continue;
        }
        if (ROW_SOFT[c].includes(f) || matchesFrom(cur, has(existing, f), change.from)) {
          set[f] = change.to;
        } else {
          conflicts.push(`${c}/${id}.${f}`);
        }
      }
      if (Object.keys(set).length > 0) {
        w.update.push({ id: u.id, set });
        touched.push([c, { ...existing, ...set }]);
      }
    }

    if (w.create.length || w.update.length || w.remove.length) {
      writes.rows[c] = w;
    }
  }

  // References: what this patch writes must point to rows that still exist,
  // and what it deletes must not be pointed to by a row that stays.
  const finalIds = {};
  for (const c of COLLECTIONS) {
    finalIds[c] = new Set([...byId[c].keys()].filter((id) => !removed[c].has(id)));
    for (const row of ((writes.rows[c] || {}).create || [])) {
      finalIds[c].add(String(row.id));
    }
  }
  const dangling = (target, v) => !isBlank(v) && !finalIds[target].has(String(v)) && !foreignIds.has(String(v));
  for (const [c, row] of touched) {
    for (const [f, target] of Object.entries(REFS[c] || {})) {
      if (dangling(target, row[f])) {
        conflicts.push(`${c}/${row.id}.${f}`);
      }
    }
  }
  for (const [c, refs] of Object.entries(REFS)) {
    const updates = new Map(((writes.rows[c] || {}).update || []).map((u) => [String(u.id), u.set]));
    for (const row of current[c] || []) {
      if (removed[c].has(String(row.id))) {
        continue;
      }
      const merged = { ...row, ...(updates.get(String(row.id)) || {}) };
      for (const [f, target] of Object.entries(refs)) {
        if (!isBlank(merged[f]) && removed[target].has(String(merged[f]))) {
          conflicts.push(`${target}/${merged[f]}`); // still used here
        }
      }
    }
  }

  return { conflicts: [...new Set(conflicts)].sort(), writes };
}

// The project as it is after `writes` (tests; the server writes rows instead).
function applyWrites(current, writes) {
  const next = JSON.parse(JSON.stringify(current));
  Object.assign(next, writes.project || {});
  for (const [c, w] of Object.entries(writes.rows || {})) {
    const remove = new Set((w.remove || []).map(String));
    const updates = new Map((w.update || []).map((u) => [String(u.id), u.set]));
    next[c] = (next[c] || [])
      .filter((r) => !remove.has(String(r.id)))
      .map((r) => (updates.has(String(r.id)) ? { ...r, ...updates.get(String(r.id)) } : r))
      .concat(JSON.parse(JSON.stringify(w.create || [])));
  }
  return next;
}

module.exports = { mergePatch, applyWrites, eq, COLLECTIONS, PROJECT_FIELDS };
