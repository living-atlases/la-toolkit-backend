const { announce, list } = require('../libs/presence');

module.exports = {
  friendlyName: 'Presence',

  description:
    'The calling socket says which project it has open and on which page; ' +
    'every subscribed socket gets the updated list (`presence` event).',

  inputs: {
    projectId: { type: 'string', allowNull: true },
    mode: { type: 'string', allowNull: true },
  },

  exits: {},

  fn: async function ({ projectId, mode }) {
    if (!this.req.isSocket) {
      throw { badRequest: 'Only a client socket can announce its presence.' };
    }
    announce(sails.sockets.getId(this.req), projectId, mode);
    // The caller also learns who else is there.
    return { sessions: list() };
  },
};
