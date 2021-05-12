/**
 * CmdHistoryEntry.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// noinspection JSUnusedGlobalSymbols
module.exports = {
  tableName: 'cmd_history_entries',
  attributes: {
    // Basic
    // Location info
    desc: { type: 'string', allowNull: false },
    logsPrefix: { type: 'string', allowNull: false },
    logsSuffix: { type: 'string', allowNull: false },
    invDir: { type: 'string', allowNull: false },
    // previously cmd
    rawCmd: { type: 'string', allowNull: false },
    // unknown, aborted, success, failed
    result: {
      type: 'string',
      defaultsTo: 'unknown',
      isIn: ['unknown', 'aborted', 'success', 'failed'],
    },

    // Relations
    projectId: {
      model: 'project',
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

  beforeDestroy: function (criteria, cb) {
    var cmdEntryId = criteria.where.id;
    Cmd.destroy({ cmdHistoryEntryId: cmdEntryId }).exec(function (err) {
      cb();
    });

    /* var ids = _.pluck(destroyedCmdEntry, 'id');

    if (ids && ids.length) {
      Cmd.destroy({ cmdHistoryEntryId: ids });
    } else {
      cb();
    } */
  },
};
