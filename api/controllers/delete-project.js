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
    // Notify subs socket clients
    Project.publish(
      projects.map((p) => p.id),
      projects,
      this.req
    );
    return this.res.json({ projects: projects });
  },
};
