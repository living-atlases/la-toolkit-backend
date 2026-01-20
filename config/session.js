/**
 * Session Configuration
 * (sails.config.session)
 *
 * Use the settings below to configure session integration in your app.
 * (for additional recommended settings, see `config/env/production.js`)
 *
 * For all available options, see:
 * https://sailsjs.com/config/session
 */

module.exports.session = {
  /***************************************************************************
   *                                                                          *
   * Session secret is automatically generated when your new app is created   *
   * Replace at your own risk in production-- you will invalidate the cookies *
   * of your users, forcing them to log in again.                             *
   *                                                                          *
   ***************************************************************************/
  secret: 'ad745a613cd7507f817406a11b080eba',

  /***************************************************************************
   *                                                                          *
   * Customize when built-in session support will be skipped.                 *
   *                                                                          *
   * (Useful for performance tuning; particularly to avoid wasting cycles on  *
   * session management when responding to simple requests for static assets, *
   * like images or stylesheets.)                                             *
   *                                                                          *
   ***************************************************************************/
  // isSessionDisabled: function (req){
  //   return !!req.path.match(req._sails.LOOKS_LIKE_ASSET_RX);
  // },

  /***************************************************************************
   *                                                                          *
   * Use a Connect-compatible session store. We create the store instance     *
   * using connect-mongo's modern API to avoid the legacy-constructor error.  *
   *                                                                          *
   ***************************************************************************/
  store: (function(){
    try {
      const MongoStore = require('connect-mongo');
      return MongoStore.create({
        mongoUrl: process.env.DATABASE_URL,
        collectionName: 'sessions',
        // Optional: set TTL (seconds) for session documents, e.g. 14 days
        ttl: 14 * 24 * 60 * 60
      });
    } catch (e) {
      // If require fails, rethrow a clearer error for the Sails startup logs
      throw new Error('Unable to create session store with connect-mongo: ' + e.message);
    }
  })(),
};
