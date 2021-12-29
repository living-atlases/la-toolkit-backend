module.exports = {


  friendlyName: 'Projects subs',


  description: '',


  inputs: {

  },


  exits: {

  },


  fn: async function (inputs) {
    if (!this.req.isSocket) {
      throw {badRequest: 'Only a client socket can subscribe to projects.  But you look like an HTTP request to me.'};
    }
    let ps = await Project.find({});
    // Now we'll subscribe our client socket to each of these records.
    Project.subscribe(this.req, _.pluck(ps, 'id'));
    console.log('Subscribed to projects')
    // All done.
    return;
  }


};
