module.exports = {
  friendlyName: 'Check other',

  description: '',

  inputs: {
    checks: {
      type: 'ref',
      required: true,
    },
    server: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    inputs.checks.forEach(async (check) => {
      let args;
      switch (check) {
        case 'mysql':
        case 'mongodb':
          break;
        // case: 'psql':
        default:
          args = '';
      }
      await sails.helpers.nagiosCheck.with({
        check: check,
        server: inputs.server,
        args: args,
      });
    });

    // TODO

    /* check vm1 mysql
     * check vm2 mysql
     * check vm1 mongodb
     * check vm1 pgsql "-H 127.0.0.1 -l doi -p $DOI_PG_PASS"
     * #check vm3 pgsql "-H 127.0.0.1 -l postgres -p $SPATIAL_PG_PASS" # FIXME
     */
  },
};
