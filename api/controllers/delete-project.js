const { notifyProjects } = require('../libs/notify-projects');

module.exports = {
  friendlyName: "Delete project",

  description: "",

  inputs: {
    id: {
      type: "string",
      description: "project id",
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs) {
    // A data hub's deploys reference the portal's clusters: once those go,
    // the hub rows pointing at them would dangle.
    const clusterIds = (await Cluster.find({ projectId: inputs.id })).map(
      (c) => c.id
    );
    if (clusterIds.length > 0) {
      await ServiceDeploy.destroy({ clusterId: { in: clusterIds } });
    }
    await CmdHistoryEntry.destroy({ projectId: inputs.id });
    await ServiceDeploy.destroy({ projectId: inputs.id });
    await Service.destroy({ projectId: inputs.id });
    await Server.destroy({ projectId: inputs.id });
    await Cluster.destroy({ projectId: inputs.id });
    await Variable.destroy({ projectId: inputs.id });
    await Project.destroy({ id: inputs.id }).meta({
      // This seems that does not work so we delete the associations before
      cascade: true,
    });
    let projects = await sails.helpers.populateProject();
    // Notify the browsers (projects-subs)
    notifyProjects();
    return this.res.json({ projects: projects });
  },
};
