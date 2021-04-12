/**
 * Project.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  tableName: 'projects',
  attributes: {
    // Basic
    /* uuid: {
      type: 'string',
      unique: true,
    }, */
    longName: { type: 'string', allowNull: false },
    shortName: { type: 'string', allowNull: false },
    dirName: { type: 'string' },
    domain: { type: 'string', allowNull: false },
    useSSL: { type: 'boolean', allowNull: false, defaultsTo: true },
    isHub: { type: 'boolean', allowNull: false, defaultsTo: false },

    // Additional
    theme: { type: 'string', allowNull: false },
    mapZoom: { type: 'number' },
    mapBoundsFstPoint: { type: 'json', allowNull: false },
    mapBoundsSndPoint: { type: 'json', allowNull: false },
    additionalVariables: { type: 'string', allowNull: false },

    // Software vars
    alaInstallRelease: { type: 'string', allowNull: true },
    generatorRelease: { type: 'string', allowNull: true },

    // Relations
    servers: { model: 'server' },
    services: { model: 'service' },
    variables: { model: 'variable' },
    cmdHistoryEntries: { model: 'cmdHistoryEntry' },
    groups: {
      collection: 'group',
      via: 'projects',
    },

    // Status vars
    status: { type: 'string', allowNull: false, defaultsTo: 'created' },
    isCreated: { type: 'boolean', allowNull: false, defaultsTo: false },
    fstDeployed: { type: 'boolean', allowNull: false, defaultsTo: false },
    advancedEdit: { type: 'boolean', allowNull: false, defaultsTo: false },
    advancedTune: { type: 'boolean', allowNull: false, defaultsTo: false },

    /*
       List<CmdHistoryEntry> cmdHistory;



     */
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
