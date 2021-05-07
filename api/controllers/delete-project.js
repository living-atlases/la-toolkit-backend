module.exports = {
  friendlyName: 'Delete project',

  description: '',

  inputs: {
    id: {
      type: 'string',
      description: 'project id',
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs, exits) {
    await CmdHistoryEntry.destroy({ projectId: inputs.id });
    await ServiceDeploy.destroy({ projectId: inputs.id });
    await Service.destroy({ projectId: inputs.id });
    await Server.destroy({ projectId: inputs.id });
    await Variable.destroy({ projectId: inputs.id });
    await Project.destroy({ id: inputs.id }).meta({
      // This seemst that does not work so we delete the associations before
      cascade: true,
    });
    return exits.success();
  },
};
