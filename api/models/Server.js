/**
 * Server.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  tableName: 'servers',
  attributes: {
    // Basic
    /* uuid: {
      type: 'string',
      unique: true,
    }, */
    name: { type: 'string' },
    aliases: { type: 'json' },

    // Connectivity
    ip: { type: 'string', defaultsTo: '' },
    sshPort: { type: 'number', defaultsTo: 22 },
    sshUser: { type: 'string' },
    gateways: { type: 'json' },

    // Status
    reachable: {
      type: 'string',
      defaultsTo: 'unknown',
      isIn: ['unknown', 'success', 'failed'],
    },
    sshReachable: {
      type: 'string',
      defaultsTo: 'unknown',
      isIn: ['unknown', 'success', 'failed'],
    },
    sudoEnabled: {
      type: 'string',
      defaultsTo: 'unknown',
      isIn: ['unknown', 'success', 'failed'],
    },

    // Facts
    osName: { type: 'string' },
    osVersion: { type: 'string' },

    // Relations
    projectId: {
      model: 'project',
    },
    sshKeyId: { model: 'sshKey' },
    serviceDeploys: { collection: 'serviceDeploy', via: 'serverId' },

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
