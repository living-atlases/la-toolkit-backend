const cp = require('child_process');
const parse = require('url-parse');
const csv = require('csvtojson/v2');
const fs = require('fs');
const p = require('path');
const Base64 = require('js-base64');
const loadIniFile = require('read-ini-file');
const {
  defExecTimeout,
  logsProdFolder,
  logsProdDevLocation,
  logErr,
} = require('../libs/utils.js');
const {localPasswordsPath} = require('../libs/project-utils.js');

let preCmd = sails.config.preCmd;
if (preCmd !== '') {
  preCmd = preCmd + ' ';
}
const csvToJson = async (csvToConvert) => {
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
      headers: ['time', 'server', 'checkId', 'serviceName', 'service', 'args', 'serviceCmd', 'code', 'msg'],
    })
      .fromString(csvToConvert)
      .then((json) => {
          resolve(json);
        },
        (e) => {
          console.log('Error converting check results to json');
          console.error(e);
          reject(e);
        });
  });
}

let checkAndUpdateDb = async (cmd, outFileProdDev, results, id, checks, server, debug = false) => {
  let fullcmd = `${preCmd}${cmd}`;
  if (debug) console.log(`check_by_ssh start for ${server}`)
  await cp.execSync(fullcmd, {
    cwd: sails.config.sshDir,
    timeout: defExecTimeout,
  });
  let outS = await fs.readFileSync(outFileProdDev).toString();
  // console.log(outS.toString());
  // console.log(`check_by_ssh end and output ready for ${server}`)
  // console.log(`ssh checks completed in ${server}`);

  let checksRes = await csvToJson(outS);
  if (debug) console.log(`checks converted in ${server}`);
  results[id] = checksRes;
  let sdStatus = {};
  // let sStatus = {};
  for await (let checkRes of checksRes) {
    // console.log(checkRes);
    // console.log(checks[checkRes.checkId]);
    for (let s of checks[checkRes.checkId].serviceDeploys) {
      let currentCodeStatus = parseInt(checkRes.code)
      if (sdStatus[s] != null) sdStatus[s] += currentCodeStatus;
      else sdStatus[s] = currentCodeStatus;
      if (currentCodeStatus !== 0) {
        console.log(`\nFailed check for ${checkRes.serviceName}: ${checkRes.service} ${checkRes.service !== 'check_url' ? checkRes.args : Base64.decode(checkRes.args)}`);
        console.log(`Output: ${Base64.decode(checkRes.msg)}`);
        console.log(`Check cmd: ${Base64.decode(checkRes.serviceCmd)}`);
      }
    }
    /* Disabled for now
    for (let s of checks[checkRes.checkId].services) {
       if (sStatus[s] !=  null) sStatus[s] += parseInt(checkRes.code);
       else sStatus[s] = parseInt(checkRes.code);
     } */
  }
  if (debug) console.log(`Update db results of ${server}`);
  let sdIds = Object.keys(sdStatus);
  await Promise.all(sdIds.map(async sdId => {
    // for await (let s of Object.keys(sdStatus)) {
    await ServiceDeploy.updateOne({id: sdId}).set({
      status: sdStatus[sdId] === 0 ? 'success' : 'failed',
      checkedAt: Date.now()
    });
    if (debug) console.log(`SD updated for ${server}`);
  }));
  /* Disabled for now
  for (let s in sStatus) {
    await Service.updateOne({id: s}).set({
      status: sdStatus[s] === 0 ? 'success' : 'failed',
      checkedAt: Date.now()
    });
  }*/
  if (debug) console.log(`End of csv to json and update of ${server}`);
};

module.exports = {
  friendlyName: 'Test host services',

  description: '',

  inputs: {
    projectId: {
      type: 'string',
      description: 'project id',
      required: true,
    },
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

    // -t timeout
    const checkSshBase =
      '/usr/local/bin/check_by_ssh -t 40 -v -F /home/ubuntu/.ssh/config -j';
    const plugins = 'sudo /usr/lib/nagios/plugins/';
    //  -H ala-install-test-1 -n ala-1 -s uptime:uptime:mysql:https -C uptime -C uptime -C 'sudo /usr/lib/nagios/plugins/check_mysql' -C '/usr/lib/nagios/plugins/check_tcp -H localhost -p 443'

    let pId = inputs.projectId;
    let proj = await Project.findOne({id: pId});
    let projectPath = proj.dirName;
    let passPath = localPasswordsPath(projectPath);
    if (!fs.existsSync(passPath)) {
      console.error(`Cannot access to pass file in ${passPath}`);
    }
    let passwordsRead = await loadIniFile.sync(passPath);
    let passwords = {};
    for (let partialPass of Object.values(passwordsRead)) {
      // We join all:vars with cas:vars, etc, to get mongo password for instance
      Object.assign(passwords, partialPass);
    }

    try {
      await Promise.all(
        serversIds.map(async (id) => {
            let s = await Server.findOne({id: id});

            let server = s.name;
            const checks = serverChecks[id];

            let outFile = `${server}-checks.txt`;
            let outFileProdDev = p.join(logsProdDevLocation(), outFile);

            try {
              // try to remove previous file as the check_by_ssh appends
              await fs.unlinkSync(outFileProdDev);
            } catch (err) {
            }

            let serviceName = [];
            let serviceCommand = [];

            const serverCheckBase = `${checkSshBase} -H ${server} -n ${id}`;
            const checkIds = Object.keys(checks);
            console.log(`>>> Checking server ${server}`);
            for await (const checkId of checkIds) {
              let check = checks[checkId];
              let type = check.type;
              let checkServiceName = check.name;
              switch (type) {
                case "tcp":
                  let host = check.host; // parseInt(check.args) === 8983 || parseInt(check.args) === 9000 ? server : "localhost";
                  let tcpServiceCmd =
                    // -r, --refuse=ok|warn|crit
                    `${plugins}check_tcp -H ${host} -r crit -p ${check.args}`;
                  serviceName.push(`${checkId}þ${checkServiceName}þcheck_tcpþ${check.args}þ${Base64.encode(tcpServiceCmd)}`);
                  serviceCommand.push(tcpServiceCmd);
                  break;
                case "udp":
                  let udpServiceCmd = `${plugins}check_udp -H localhost -p ${check.args}`;
                  serviceName.push(`${checkId}þ${checkServiceName}þcheck_udpþ${check.args}þ${Base64.encode(udpServiceCmd)}`);
                  serviceCommand.push(udpServiceCmd);
                  break;
                case "other":
                  let checkName = check.args;
                  let checkExecutable;
                  let args = '';
                  switch (checkName) {
                    case 'mysql':
                      checkExecutable = 'mysql';
                      args = `-H localhost -u root -p ${passwords['mysql_root_password']}`;
                      break;
                    case 'mongo':
                      checkExecutable = 'mongodb';
                      args = `-H 127.0.0.1 -u admin -p ${passwords['mongodb_root_password']}`;
                      break;
                    case 'postgresql':
                      checkName = ''; // we disable this check now as the admin user are not currently created
                      checkExecutable = 'pgsql';
                      args = `-H 127.0.0.1 -l postgres -p ${passwords['postgresql_password']}| paste -s - - | grep -v '^$'`;
                      break;
                    default:
                      console.log(`No tests properly configured for ${check.args}`)
                      checkName = '';
                  }
                  if (checkName !== '') {
                    let otherServiceCmd = `(set -o pipefail && ${plugins}check_${checkExecutable} ${args})`;
                    serviceName.push(`${checkId}þ${checkServiceName}þcheck_${checkName}þþ${Base64.encode(otherServiceCmd)}`);
                    serviceCommand.push(otherServiceCmd);
                  }
                  break;
                case "url":
                  let url = check.args;
                  let pUrl = parse(url, true);
                  let hostname = pUrl.hostname;
                  // let protocol = pUrl.protocol;
                  let port = pUrl.port != null && pUrl.port.length > 0 ? pUrl.port : pUrl.protocol === 'http:' ? '80' : '443 -S';
                  let pathname = pUrl.pathname;
                  if (pathname.includes('/admin/') || pathname.includes('/alaAdmin/')) {
                    // skip
                    break;
                  }
                  let urlArgs = `-H ${hostname} -I ${server} -t 40 --sni -f follow -p ${port} -u '${pathname}'`;
                  let urlServiceCmd = `${plugins}check_http ${urlArgs}`;
                  serviceName.push(`${checkId}þ${checkServiceName}þcheck_urlþ${Base64.encode(url)}þ${Base64.encode(urlServiceCmd)}`);
                  serviceCommand.push(urlServiceCmd);
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

              // console.log(cmd);
              console.log(`checks started in ${server}`);
              try {
                await checkAndUpdateDb(cmd, outFileProdDev, results, id, checks, server);
                console.log(`<<< End of checks of ${server}`);
              } catch (err) {
                // Process typical: 'check_by_ssh: Error parsing output' error when the services are not deployed/ready
                logErr(err);
                console.log(`Checking ${server} cmd by cmd as some failed --------------- `);
                // lets try cmd by cmd
                for (let i = 0; i < serviceName.length; i++) {
                  let cmd = `${serverCheckBase} -s ${serviceName[i]} -C "${serviceCommand[i]}" -O ${p.join(
                    logsProdFolder,
                    outFile
                  )}`;
                  try {
                    await checkAndUpdateDb(cmd, outFileProdDev, results, id, checks, server);
                  } catch (err) {
                    logErr(err);
                  }
                }
              }
            }
          }
        ));
      let sds = await ServiceDeploy.find({projectId: pId});
      let ss = await Service.find({projectId: pId});
      console.log(`--- Returning check results for ${Object.keys(results).length} servers`)
      this.res.json({projectId: pId, serviceDeploys: sds, services: ss, results: results});
    } catch (e) {
      console.log(e);
      this.res.serverError(e);
    }
  },
};
