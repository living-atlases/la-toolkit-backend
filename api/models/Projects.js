/**
 * Projects.js
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
    longName: { type: 'string', allowNull: false },
    shortName: { type: 'string', allowNull: false },
    dirName: { type: 'string' },
    domain: { type: 'string', allowNull: false },
    useSSL: { type: 'boolean', allowNull: false, defaultsTo: true },
    additionalVariables: { type: 'string', allowNull: false },
    isCreated: { type: 'boolean', allowNull: false, defaultsTo: false },
    fstDeployed: { type: 'boolean', allowNull: false, defaultsTo: false },
    advancedEdit: { type: 'boolean', allowNull: false, defaultsTo: false },
    advancedTune: { type: 'boolean', allowNull: false, defaultsTo: false },
    theme: { type: 'string', allowNull: false },
    status: { type: 'string', allowNull: false, defaultsTo: 'created' },
    alaInstallRelease: { type: 'string', allowNull: true },
    generatorRelease: { type: 'string', allowNull: true },
    servers: { model: 'servers' },
    services: { model: 'services' },
    variables: { model: 'variables' },
    mapZoom: { type: 'number' },
    mapBoundsFstPoint: { type: 'json', allowNull: false },
    mapBoundsSndPoint: { type: 'json', allowNull: false },
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
