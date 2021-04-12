/**
 * CmdHistoryEntry.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  tableName: 'cmd_history_entries',
  attributes: {
    // Basic
    /* uuid: {
      type: 'string',
      unique: true,
    }, */
    // Location info
    logsPrefix: { type: 'string', allowNull: false },
    logsSuffix: { type: 'string', allowNull: false },
    invDir: { type: 'string', allowNull: false },
    // previously cmd
    rawCmd: { type: 'string', allowNull: false },
    // unknown, aborted, success, failed
    result: { type: 'string', defaultsTo: 'unknown' },

    // Relations
    projectId: {
      collection: 'project',
      via: 'cmdHistoryEntries',
    },
    cmd: { collection: 'cmd', via: 'cmdHistoryEntryId' },

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
