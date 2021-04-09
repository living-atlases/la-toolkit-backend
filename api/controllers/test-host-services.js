const cp = require('child_process');
const parse = require('url-parse');
const {
  defExecTimeout,
  logsProdFolder,
  logsProdDevLocation,
} = require('../libs/utils.js');
const csv = require('csvtojson/v2');
const fs = require('fs');
const p = require('path');
const Base64 = require('js-base64');

let preCmd = sails.config.preCmd;
if (preCmd !== '') {
  preCmd = preCmd + ' ';
}
/*
async function convert(outS) {
  return new Promise((resolve, reject) => {
    csv({
      noheader: true,
      delimiter: 'þ',
      // https://www.npmjs.com/package/csvtojson#column-parser
      colParser: {
        msg: function (item) {
          return Base64.encode(item);
        },
      },
      headers: ['time', 'sever', 'service', 'args', 'code', 'msg'],
    })
      .fromString(outS)
      .then(
        (jsonA) => {
          resolve(jsonA);
        },
        (e) => {
          console.log('Error converting check results to json');
          console.error(e);
          reject();
        }
      );
  });
}
*/
module.exports = {
  friendlyName: 'Test host services',

  description: '',

  inputs: {
    hostsServices: {
      type: 'json',
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs) {
    let map = inputs.hostsServices.map;
    let servers = Object.keys(map);

    // Prepare results object
    let results = {};
    servers.forEach((s) => (results[s] = {}));

    const checkSshBase =
      '/usr/local/bin/check_by_ssh -F /home/ubuntu/.ssh/config';
    const plugins = 'sudo /usr/lib/nagios/plugins/';
    //  -H ala-install-test-1 -n ala-1 -s uptime:uptime:mysql:https -C uptime -C uptime -C 'sudo /usr/lib/nagios/plugins/check_mysql' -C '/usr/lib/nagios/plugins/check_tcp -H localhost -p 443'

    try {
      await Promise.all(
        servers.map(async (server) => {
          const services = map[server];

          const serverCheckBase = `${checkSshBase} -H ${server} -n ${server}`;
          let serviceName = [];
          let serviceCommand = [];

          services.tcpPorts.forEach((port) => {
            serviceName.push(`check_tcpþ${port}`);
            serviceCommand.push(
              `${plugins}check_tcp -H localhost -r ok -p ${port}`
            );
          });

          services.udpPorts.forEach((port) => {
            serviceName.push(`check_udpþ${port}`);
            serviceCommand.push(`${plugins}check_udp -H localhost -p ${port}`);
          });

          services.otherChecks.forEach((check) => {
            let checkName;
            let args = '';
            switch (check) {
              case 'mysql':
              case 'mongodb':
                checkName = check;
                break;
              // case: 'psql':
              default:
                checkName = '';
            }
            if (checkName !== '') {
              serviceName.push(`check_${check}þ`);
              serviceCommand.push(
                `${plugins}check_${checkName} -H localhost${args}`
              );
            }
          });

          services.urls.forEach((url) => {
            let pUrl = parse(url, true);
            let hostname = pUrl.hostname;
            // let protocol = pUrl.protocol;
            let port = pUrl.protocol === 'http:' ? '80' : '443 -S';
            let pathname = pUrl.pathname;
            let args = `-H ${hostname} -I ${server} -t 40 --sni -f follow -p ${port} -u '${pathname}'`;
            serviceName.push(`check_urlþ${Base64.encode(url)}`);
            serviceCommand.push(`${plugins}check_http ${args}`);
          });

          let outFile = `${server}-checks.txt`;
          let outFileProdDev = p.join(logsProdDevLocation(), outFile);

          try {
            // try to remove previous file as the check_by_ssh appends
            fs.unlinkSync(outFileProdDev);
          } catch (err) {}

          let cmd = `${serverCheckBase} -s ${serviceName.join(
            ':'
          )} \\\n -C "${serviceCommand.join('" \\\n -C "')}" -O ${p.join(
            logsProdFolder,
            outFile
          )}`;

          // console.log(cmd);
          // console.log(`checks started in ${server}`);
          try {
            let out = '';
            let err = '';
            let fullcmd = `${preCmd}${cmd}`;
            out = cp.execSync(fullcmd, {
              cwd: sails.config.sshDir,
              timeout: defExecTimeout,
              stderr: err,
            });
            let outS = fs.readFileSync(outFileProdDev).toString();

            // console.log(outS.toString());
            // console.log(`checks completed in ${server}`);

            return csv({
              noheader: true,
              delimiter: 'þ',
              // https://www.npmjs.com/package/csvtojson#column-parser
              colParser: {
                msg: function (item) {
                  return Base64.encode(item);
                },
              },
              headers: ['time', 'server', 'service', 'args', 'code', 'msg'],
            })
              .fromString(outS)
              .then(
                (jsonR) => {
                  // console.log(`checks converted in ${server}`);
                  results[server] = jsonR;
                },
                (e) => {
                  console.log('Error converting check results to json');
                  console.error(e);
                  reject();
                }
              );
          } catch (err) {
            console.error(
              err.output != null && err.output[1] != null
                ? err.output[1].toString()
                : err.toString()
            );
          }

          /*
           * let otherServers = servers.filter((s) => s !== server);
           * // console.log(`--------- server: ${server} others: ${otherServers}`);
           */
        })
      );
      // console.log(results);
      this.res.json(results);
    } catch (e) {
      console.log(e);
      this.res.serverError(e);
    }
  },
};
