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
    desc: {type: 'string', allowNull: false},
    logsPrefix: {type: 'string', allowNull: false},
    logsSuffix: {type: 'string', allowNull: false},
    invDir: {type: 'string', allowNull: false},
    // previously cmd
    rawCmd: {type: 'string', allowNull: false},
    // unknown, aborted, success, failed
    result: {
      type: 'string',
      defaultsTo: 'unknown',
      isIn: ['unknown', 'aborted', 'success', 'failed'],
    },
    duration: {type: 'number', allowNull: true},

    // Relations
    projectId: {
      model: 'project',
    },
    cmd: {collection: 'cmd', via: 'cmdHistoryEntryId'},

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
    let cmdEntryId = criteria.where.id;
    console.log(`Before Deleting CmdHistoryEntry with id: '${cmdEntryId}'`);
    if (cmdEntryId != null) {
      console.log(`Deleting CmdHistoryEntry with id: '${cmdEntryId}'`);
      Cmd.destroy({cmdHistoryEntryId: cmdEntryId}).exec(function (/* err */) {
        cb();
      });
    } else {
      // If not hangs
      cb();
    }
    /* var ids = _.pluck(destroyedCmdEntry, 'id');

    if (ids && ids.length) {
      Cmd.destroy({ cmdHistoryEntryId: ids });
    } else {
      cb();
    } */
  },
};
