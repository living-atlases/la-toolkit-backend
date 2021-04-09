/**
 * Server.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    uuid: {
      type: 'string',
      unique: true,
    },
    name: { type: 'string' },
    ip: { type: 'string', defaultsTo: '' },
    sshPort: { type: 'number', defaultsTo: 22 },
    sshUser: { type: 'string' },
    aliases: { type: 'json' },
    gateways: { type: 'json' },
    sshKey: { model: 'sshKeys' },
    reachable: { type: 'string', defaultsTo: 'unknown' },
    sshReachable: { type: 'string', defaultsTo: 'unknown' },
    sudoEnabled: { type: 'string', defaultsTo: 'unknown' },
    osName: { type: 'string' },
    osVersion: { type: 'string' },
    project: {
      collection: 'projects',
      via: 'servers',
    },
    services: { collection: 'services', via: 'servers' },

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
