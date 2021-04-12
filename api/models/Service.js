/**
 * Service.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  tableName: 'services',
  attributes: {
    // Basic
    /* uuid: {
      type: 'string',
      unique: true,
      allowNull: false,
    }, */
    nameInt: { type: 'string', allowNull: false },
    use: { type: 'boolean', allowNull: false, defaultsTo: false },

    // Urls related
    iniPath: { type: 'string', allowNull: false },
    suburl: { type: 'string', allowNull: false },
    usesSubdomain: { type: 'boolean', allowNull: false, defaultsTo: true },

    // Status
    status: { type: 'string', defaultsTo: 'unknown' },

    // Relations
    project: {
      collection: 'project',
      via: 'services',
    },
    serviceDeploys: { collection: 'serviceDeploy', via: 'serviceId' },

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
