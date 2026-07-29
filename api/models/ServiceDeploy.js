/**
 * ServiceDeploy.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  tableName: "service_deploys",
  attributes: {
    additionalVariables: { type: "string", allowNull: false },
    // Status
    status: {
      type: "string",
      defaultsTo: "unknown",
      isIn: ["unknown", "success", "failed"],
    },
    softwareVersions: { type: "json" },
    checkedAt: { type: "number", allowNull: true },

    // Which leg this deploy belongs to. Same values as Cluster.type.
    // The toolkit has always sent it, but without the attribute Waterline dropped it on
    // save, so every deploy came back from the DB as a VM one. The toolkit looks a deploy
    // up by (project, service, server, cluster, TYPE), never matched its own docker
    // deploys, and created a duplicate on every assignment — seeded from the version in
    // the imported inventory, which silently undid the version picked in the UI.
    type: {
      type: "string",
      defaultsTo: "vm",
      isIn: ["vm", "dockerSwarm", "k8s", "dockerCompose"],
    },

    serviceId: { model: "service" },
    serverId: { model: "server" },
    clusterId: { model: "cluster" },
    projectId: { model: "project" },

    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝
  },
};
