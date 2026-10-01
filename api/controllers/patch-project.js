const { mergePatch, COLLECTIONS } = require('../libs/project-patch');
const { withProjectLock } = require('../libs/project-lock');
const { notifyProjects } = require('../libs/notify-projects');

const MODELS = {
  servers: () => Server,
  clusters: () => Cluster,
  services: () => Service,
  serviceDeploys: () => ServiceDeploy,
  variables: () => Variable,
};

// The project as mergePatch sees it: its row plus the rows it owns.
async function stored(projectId) {
  const project = await Project.findOne({ id: projectId }).populate('parent');
  if (!project) {
    return null;
  }
  const current = { ...project };
  for (const c of COLLECTIONS) {
    current[c] = await MODELS[c]().find({ projectId });
  }
  // A hub places services on its portal's servers and clusters.
  const foreignIds = [];
  for (const parent of project.parent || []) {
    for (const c of ['servers', 'clusters', 'services']) {
      const rows = await MODELS[c]().find({ projectId: parent.id });
      foreignIds.push(...rows.map((r) => r.id));
    }
  }
  delete current.parent;
  return { current, foreignIds };
}

async function write(projectId, writes) {
  for (const c of COLLECTIONS) {
    const w = writes.rows[c];
    if (!w) {
      continue;
    }
    const Model = MODELS[c]();
    for (const row of w.create) {
      await Model.create(row);
    }
    for (const u of w.update) {
      await Model.updateOne({ id: u.id }).set(u.set);
    }
    if (w.remove.length > 0) {
      await Model.destroy({ projectId, id: { in: w.remove } });
    }
  }
  if (Object.keys(writes.project).length > 0) {
    await Project.updateOne({ id: projectId }).set(writes.project);
  }
}

module.exports = {
  friendlyName: 'Patch project',

  description:
    'Applies what a client changed since the copy it read (see libs/project-patch). ' +
    'Answers 409 with the conflicting fields, writing nothing, when another session changed the same ones.',

  inputs: {
    patch: {
      type: 'json',
      required: true,
      custom: (value) => _.isObject(value) && _.isString(value.projectId),
    },
  },

  exits: {
    success: { description: 'Applied: the populated project list.' },
    notFound: { responseType: 'notFound' },
    conflict: {
      statusCode: 409,
      description: 'Another session changed the same fields: {conflicts, projects}, nothing written.',
    },
  },

  fn: async function ({ patch }) {
    const projectId = patch.projectId;
    const outcome = await withProjectLock(projectId, async () => {
      const s = await stored(projectId);
      if (!s) {
        return { notFound: true };
      }
      const { conflicts, writes } = mergePatch(s.current, patch, { foreignIds: s.foreignIds });
      if (conflicts.length > 0) {
        return { conflicts };
      }
      await write(projectId, writes);
      return { conflicts: [] };
    });
    if (outcome.notFound) {
      throw 'notFound';
    }
    const projects = await sails.helpers.populateProject();
    if (outcome.conflicts.length > 0) {
      sails.log.info(`patch-project ${projectId}: conflicts ${outcome.conflicts.join(', ')}`);
      throw { conflict: { conflicts: outcome.conflicts, projects } };
    }
    notifyProjects();
    return { projects };
  },
};
