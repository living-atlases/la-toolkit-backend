const { exec } = require("child_process");

module.exports = {
  friendlyName: "Solr query",

  description: "Execution of Solr query",

  inputs: {
    id: {
      type: "string",
      description: "project id",
      required: true,
    },
    query: {
      type: "string",
      description: "Solr query",
      required: true,
    },
    sshHost: {
      type: "string",
      description: "SSH host",
      required: true,
    },
  },

  exits: {
    success: {
      description: "All done.",
    },
  },

  fn: async function (inputs) {
    let sshCommand = `'curl -s "${inputs.query}"'`;

    try {
      const result = await sails.helpers.sshCmd.with({
        server: inputs.sshHost,
        cmd: sshCommand,
      });

      if (result.code !== 0) {
        // console.error(`error: ${JSON.stringify(result.err)}`);
        this.res.serverError(result.code);
        return;
      }

      // console.log(`stdout: ${result.out}`);
      return result.out;
    } catch (error) {
      // console.error(`error: ${JSON.stringify(error)}`);
      this.res.serverError(error);
    }
  },
};
