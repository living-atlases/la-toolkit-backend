const { exec } = require("child_process");
const { defExecTimeout } = require("../libs/utils.js");
const cp = require("child_process");

let preCmd = ""; // sails.config.preCmd;
if (preCmd !== "") {
  preCmd = preCmd + " ";
}

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
    // sshCommand = `mysql -u root -h 192.168.68.56 -P 3306 -pcoXXXXXXXic collectory -e "${inputs.query}" -s -N`;

    try {
      const result = cp
        .execSync(`${preCmd} ${sshCommand}`, {
          cwd: sails.config.projectDir,
          timeout: defExecTimeout,
        })
        .toString();

      // result = JSON.parse(pkgJsonS(pkg, currentVersions));

      /* const result = await sails.helpers.sshCmd.with({
        server: inputs.sshHost,
        cmd: sshCommand,
      }); */

      // console.log(result);

      // console.log(`stdout: ${result.out}`);
      return result;
    } catch (error) {
      console.error(`error: ${JSON.stringify(error)}`);
      this.res.serverError(error);
    }
  },
};
