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
    let serverChecks = inputs.hostsServices.checks;
    let serversIds = Object.keys(serverChecks);

    // Prepare results object
    let results = {};
    // serviceDeployIds.forEach((s) => (results[s] = {status: 'unknown'}));

    const checkSshBase =
      '/usr/local/bin/check_by_ssh -F /home/ubuntu/.ssh/config -j';
    const plugins = 'sudo /usr/lib/nagios/plugins/';
    //  -H ala-install-test-1 -n ala-1 -s uptime:uptime:mysql:https -C uptime -C uptime -C 'sudo /usr/lib/nagios/plugins/check_mysql' -C '/usr/lib/nagios/plugins/check_tcp -H localhost -p 443'

    let pId;
    try {
      await Promise.all(
        serversIds.map(async (id) => {
          let s = await Server.findOne({id: id});
          if (pId == null) pId = s.projectId;
          let server = s.name;
          const checks = serverChecks[id];

          let outFile = `${server}-checks.txt`;
          let outFileProdDev = p.join(logsProdDevLocation(), outFile);

          try {
            // try to remove previous file as the check_by_ssh appends
            await fs.unlinkSync(outFileProdDev);
          } catch (err) {}

          let serviceName = [];
          let serviceCommand = [];
          const serverCheckBase = `${checkSshBase} -H ${server} -n ${id}`;
          const checkIds = Object.keys(checks);
          for (const checkId of checkIds) {
            let check = checks[checkId];
            let type = check.type;

            switch (type) {
              case "tcp":
                serviceName.push(`${checkId}þcheck_tcpþ${check.args}`);
                serviceCommand.push(
                  // -r, --refuse=ok|warn|crit
                  `${plugins}check_tcp -H localhost -r crit -p ${check.args}`
                );
                break;
              case "udp":
                serviceName.push(`${checkId}þcheck_udpþ${check.args}`);
                serviceCommand.push(`${plugins}check_udp -H localhost -p ${check.args}`);
                break;
              case "other":
                let checkName;
                let args = '';
                switch (check.args) {
                  case 'mysql':
                  case 'mongodb':
                    checkName = check.args;
                    break;
                  // case: 'psql':
                  default:
                    checkName = '';
                }
                if (checkName !== '') {
                  serviceName.push(`${checkId}þcheck_${checkName}þ`);
                  serviceCommand.push(
                    `${plugins}check_${checkName} -H localhost${args}`
                  );
                }
                break;
              case "url":
                let url = check.args;
                let pUrl = parse(url, true);
                let hostname = pUrl.hostname;
                // let protocol = pUrl.protocol;
                let port = pUrl.protocol === 'http:' ? '80' : '443 -S';
                let pathname = pUrl.pathname;
                if (pathname.includes('/admin/') || pathname.includes('/alaAdmin/')) {
                  // skip
                  break;
                }
                let urlArgs = `-H ${hostname} -I ${server} -t 40 --sni -f follow -p ${port} -u '${pathname}'`;
                serviceName.push(`${checkId}þcheck_urlþ${Base64.encode(url)}`);
                serviceCommand.push(`${plugins}check_http ${urlArgs}`);
                break;
              default:
                break;
            }
          }

          if (serviceName.length > 0 && serviceCommand.length > 0) {
            let cmd = `${serverCheckBase} -s ${serviceName.join(
              ':'
            )} \\\n -C "${serviceCommand.join('" \\\n -C "')}" -O ${p.join(
              logsProdFolder,
              outFile
            )}`;

            console.log(cmd);
            // console.log(`checks started in ${server}`);
            try {
              let fullcmd = `${preCmd}${cmd}`;
              await cp.execSync(fullcmd, {
                cwd: sails.config.sshDir,
                timeout: defExecTimeout,
              });
              let outS = await fs.readFileSync(outFileProdDev).toString();
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
                headers: ['time', 'server', 'checkId', 'service', 'args', 'code', 'msg'],
              })
                .fromString(outS)
                .then(
                  async (checksRes) => {
                    // console.log(`checks converted in ${server}`);
                    results[id] = checksRes;
                    let sdStatus = {};
                    // let sStatus = {};
                    for (let checkRes of checksRes) {
                      // console.log(checkRes);
                      // console.log(checks[checkRes.checkId]);
                      for (let s of checks[checkRes.checkId].serviceDeploys) {
                        if (sdStatus[s] != null) sdStatus[s] += parseInt(checkRes.code);
                        else sdStatus[s] = parseInt(checkRes.code);
                      }
                     /* Disabled for now
                     for (let s of checks[checkRes.checkId].services) {
                        if (sStatus[s] !=  null) sStatus[s] += parseInt(checkRes.code);
                        else sStatus[s] = parseInt(checkRes.code);
                      } */
                    }
                    for (let s in sdStatus) {
                      await ServiceDeploy.updateOne({id: s}).set({
                      status: sdStatus[s] === 0 ? 'success' : 'failed',
                      checkedAt: Date.now()
                    });
                    }
                    /* Disabled for now
                    for (let s in sStatus) {
                      await Service.updateOne({id: s}).set({
                        status: sdStatus[s] === 0 ? 'success' : 'failed',
                        checkedAt: Date.now()
                      });
                    }*/
                  },
                  (e) => {
                    console.log('Error converting check results to json');
                    console.error(e);
                  }
                );

            } catch (err) {
              // Process typical: 'check_by_ssh: Error parsing output' error when the services are not deployed/ready
              console.error(
                err.output != null && err.output[1] != null
                  ? err.output[1].toString()
                  : err.toString()
              );
            }
          }
        })
      );
      let sds = await ServiceDeploy.find({projectId: pId});
      let ss = await Service.find({projectId: pId});
      this.res.json({projectId: pId, serviceDeploys: sds, services: ss, results: results});
    } catch (e) {
      console.log(e);
      this.res.serverError(e);
    }
  },
};
