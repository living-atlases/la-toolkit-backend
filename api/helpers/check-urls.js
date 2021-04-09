'use strict';
let parse = require('url-parse');

module.exports = {
  friendlyName: 'Check urls',

  description: 'Check if some urls works or not',

  inputs: {
    urls: {
      type: 'ref',
      required: true,
    },
    server: {
      type: 'string',
      required: true,
    },
    otherServers: {
      type: 'ref',
      required: false,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    let host = inputs.server;
    let servers =
      typeof inputs.otherServers === 'undefined' ? [host] : inputs.otherServers;
    // console.log(`---------------------${servers}`);
    inputs.urls.forEach(async (url) => {
      let pUrl = parse(url, true);
      let hostname = pUrl.hostname;
      let protocol = pUrl.protocol;
      let port = pUrl.protocol === 'http:' ? '80' : '443 -S';
      let pathname = pUrl.pathname;
      let args = `-H ${protocol}//${hostname} -I ${host} -t 20 -p ${port} -u '${pathname}'`;
      servers.forEach(async (server) => {
        // console.log(`url: ${url} in (${server}) ----> ${args}`);
        await sails.helpers.nagiosCheck.with({
          check: 'http',
          server: server,
          args: args,
        });
      });
    });
  },
};
