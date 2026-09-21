const {diskUsage} = require('../libs/disk-usage.js');

module.exports = {
  friendlyName: 'Disk usage',

  description:
    'Free space on every server of a project (df over ssh). Read-only: it ' +
    'stores nothing. Servers are read from the database, never from the ' +
    'request, because their names end up in a shell command.',

  inputs: {
    id: {
      type: 'string',
      description: 'project id',
      required: true,
    },
    names: {
      type: 'ref',
      description:
        'Optional server names to restrict the check to. Only narrows the ' +
        'servers read from the database; unknown names are ignored.',
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    notFound: {
      responseType: 'notFound',
    },
  },

  fn: async function (inputs) {
    let servers = await Server.find({projectId: inputs.id});
    if (servers.length === 0 && !(await Project.findOne({id: inputs.id}))) {
      throw 'notFound';
    }
    if (Array.isArray(inputs.names)) {
      servers = servers.filter((s) => inputs.names.includes(s.name));
    }
    const results = await diskUsage({
      servers,
      config: {preCmd: sails.config.preCmd, sshDir: sails.config.sshDir},
    });
    return this.res.json({servers: results});
  },
};
