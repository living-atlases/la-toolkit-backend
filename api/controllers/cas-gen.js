module.exports = {
  friendlyName: 'CAS keys gen',

  description: '',

  inputs: {},

  exits: {},

  fn: async function () {
    // All done.
    let keys = {};
    keys.pac4j_cookie_signing_key = await sails.helpers.jwkGen.with({
      size: 512,
    });
    keys.pac4j_cookie_encryption_key = await sails.helpers.jwkGen.with({
      size: 256,
    });
    keys.cas_webflow_signing_key = await sails.helpers.jwkGen.with({
      size: 512,
    });
    keys.cas_webflow_encryption_key = await sails.helpers.jwkGen.with({
      size: 128,
    });

    this.res.json(keys);
  },
};
