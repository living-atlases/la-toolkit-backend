const { ROOM } = require('../libs/notify-projects');

module.exports = {


  friendlyName: 'Projects subs',


  description: 'Joins the calling socket to the room where every project change is pushed.',


  inputs: {

  },


  exits: {

  },


  fn: async function (inputs) {
    if (!this.req.isSocket) {
      throw {badRequest: 'Only a client socket can subscribe to projects.  But you look like an HTTP request to me.'};
    }
    // One room for every project, so a project created after this socket
    // subscribed is pushed too (see libs/notify-projects). The client calls
    // this again on every (re)connect: a socket loses its rooms when it drops.
    sails.sockets.join(this.req, ROOM);
    // All done.
    return;
  }


};
