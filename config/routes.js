/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {
  /***************************************************************************
   *                                                                          *
   * Make the view located at `views/homepage.ejs` your home page.            *
   *                                                                          *
   * (Alternatively, remove this and add an `index.html` file in your         *
   * `assets` directory)                                                      *
   *                                                                          *
   ***************************************************************************/

  // '/': { view: 'pages/homepage' },

  /***************************************************************************
   *                                                                          *
   * More custom routes here...                                               *
   * (See https://sailsjs.com/config/routes for examples.)                    *
   *                                                                          *
   * If a request to a URL doesn't match any of the routes in this file, it   *
   * is matched against 'shadow routes' (e.g. blueprint routes).  If it does  *
   * not match any of those, it is matched against static assets.             *
   *                                                                          *
   ***************************************************************************/
  "GET /api/v1/cas-gen": { action: "cas-gen" },
  "GET /api/v1/cas-gen/:size": { action: "cas-gen-single" },
  "POST /api/v1/gen-ssh-conf": { action: "gen-ssh-conf" },
  "GET /api/v1/ssh-key-gen/:name": { action: "ssh-key-gen" },
  "GET /api/v1/ssh-key-scan": { action: "ssh-key-scan" },
  "POST /api/v1/ssh-key-import": { action: "ssh-key-import" },
  "POST /api/v1/test-connectivity": { action: "check-connectivity" },
  "GET /api/v1/image-proxy/*": { action: "image-proxy", skipAssets: false },
  "POST /api/v1/save-conf": { action: "save-conf" },
  "GET /api/v1/get-conf": { action: "get-conf" },
  "GET /api/v1/gen/:id/:download": { action: "gen" },
  "POST /api/v1/term": { action: "term" },
  "POST /api/v1/term-close": { action: "term-close" },
  "GET /api/v1/ala-install-select/:version": {
    action: "ala-install-select",
    skipAssets: false,
  },
  "POST /api/v1/ansiblew": { action: "ansiblew" },
  "POST /api/v1/cmd-results": { action: "cmd-results" },
  "GET /api/v1/get-generator-versions": { action: "get-generator-versions" },
  "POST /api/v1/get-deps-versions": { action: "get-deps-versions" },
  "GET /api/v1/generator-select/:version": {
    action: "generator-select",
    skipAssets: false,
  },
  "POST /api/v1/check-dir-name": { action: "check-dir-name" },
  "POST /api/v1/term-logs": { action: "term-logs" },
  "GET /api/v1/get-backend-version": { action: "get-backend-version" },
  "POST /api/v1/pre-deploy": { action: "pre-deploy" },
  "POST /api/v1/post-deploy": { action: "post-deploy" },
  "POST /api/v1/test-host-services": { action: "test-host-services" },
  "POST /api/v1/add-projects": { action: "add-projects" },
  "POST /api/v1/add-project": { action: "add-project" },
  "PATCH /api/v1/update-project": { action: "update-project" },
  "DELETE /api/v1/delete-project": { action: "delete-project" },
  "GET /api/v1/get-env": { action: "get-env" },
  "POST /api/v1/branding-deploy": { action: "branding-deploy" },
  "POST /api/v1/get-service-versions": { action: "get-service-versions" },
  "POST /api/v1/pipelines-run": { action: "pipelines-run" },
  "GET /api/v1/projects-subs": { action: "projects-subs" },
  "POST /api/v1/solr-query": { action: "solr-query" },
  "POST /api/v1/mysql-query": { action: "mysql-query" },
};
