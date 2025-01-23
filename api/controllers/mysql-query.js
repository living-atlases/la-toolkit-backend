const { exec } = require("child_process");

module.exports = {
  friendlyName: "MySql query",

  description: "Execution of MySql query",

  inputs: {
    id: {
      type: "string",
      description: "project id",
      required: true,
    },
    db: {
      type: "string",
      description: "MySql db",
      required: true,
    },
    query: {
      type: "string",
      description: "MySql query",
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
    let escapedQuery = inputs.query
      .replace(/\\/g, "\\\\") // Scape backslashes
      .replace(/'/g, "'\\''"); // Scape single quotes

    let sshCommand = `'sudo mysql --defaults-file=/root/.my.cnf -D ${inputs.db} -e "${escapedQuery}" -s -N'`;

    try {
      const result = await sails.helpers.sshCmd.with({
        server: inputs.sshHost,
        cmd: sshCommand,
      });

      if (result.code !== 0) {
        console.error(`error: ${JSON.stringify(result.code)}`);
        this.res.serverError(result.err);
        return;
      }

      // console.log(`stdout: ${result.out}`);
      return result.out;
    } catch (error) {
      console.error(`error: ${JSON.stringify(error)}`);
      this.res.serverError(error);
    }
  },
};
