const cp = require('child_process');
const parse = require('url-parse');
const csv = require('csvtojson/v2');
const fs = require('fs');
const p = require('path');
const Base64 = require('js-base64');
const loadIniFile = require('read-ini-file');
const {
  mainProjectPath,
} = require('../libs/project-utils.js');
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

let checkAndUpdateDb = async (cmd, outFileProdDev, results, id, checks, server, updateDb = true, debug = false, req = null) => {
  let fullcmd = `${preCmd}${cmd}`;
  if (debug) console.log(`check_by_ssh start for ${server}`)

  try {
    await new Promise((resolve, reject) => {
      cp.exec(fullcmd, {
        cwd: sails.config.sshDir,
        timeout: defExecTimeout,
      }, (error, stdout, stderr) => {
        if (error) {
          if (debug) console.log(`check_by_ssh error for ${server}: ${error.message.split('\n')[0]}`);
        }
        resolve();
      });
    });
  } catch (execError) {
    if (debug) console.log(`SSH execution error for ${server}: ${execError.message}`);
  }

  if (!fs.existsSync(outFileProdDev)) {
    throw new Error(`Output file not found for ${server}`);
  }

  let outS;
  try {
    outS = await fs.readFileSync(outFileProdDev).toString();
  } catch (readErr) {
    throw new Error(`Failed to read output file for ${server}: ${readErr.message}`);
  }

  if (!outS || outS.trim().length === 0) {
    throw new Error(`Empty output file for ${server}`);
  }

  let checksRes;
  try {
    checksRes = await csvToJson(outS);
    if (debug) console.log(`checks converted in ${server} - ${checksRes.length} results`);
  } catch (csvErr) {
    throw new Error(`Failed to parse CSV for ${server}: ${csvErr.message}`);
  }

  if (!results[id]) {
    results[id] = checksRes;
  } else {
    results[id] = results[id].concat(checksRes);
  }

  if (updateDb && checksRes.length > 0) {
    try {
      await updateServiceDeployStatus(results[id], checks, server, debug);
    } catch (dbErr) {
      console.error(`Failed to update DB for ${server}: ${dbErr.message}`);
    }
  }

  // Send WebSocket update if req is provided
  if (req && req.isSocket && checksRes.length > 0) {
    sails.sockets.broadcast(req.socket.id, 'service-check-progress', {
      serverId: id,
      serverName: server,
      results: checksRes,
      status: 'completed'
    });
  }
};

let updateServiceDeployStatus = async (checksResults, checks, server, debug = false) => {
  let sdStatus = {};
  for await (let checkRes of checksResults) {
    if (!checks[checkRes.checkId]) {
      console.warn(`Check ID ${checkRes.checkId} not found in checks for ${server}`);
      continue;
    }
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
  }
  if (debug) console.log(`Update db results of ${server}`);
  let sdIds = Object.keys(sdStatus);
  await Promise.all(sdIds.map(async sdId => {
    await ServiceDeploy.updateOne({id: sdId}).set({
      status: sdStatus[sdId] === 0 ? 'success' : 'failed',
      checkedAt: Date.now()
    });
    if (debug) console.log(`SD updated for ${server}`);
  }));
  if (debug) console.log(`End of csv to json and update of ${server}`);
};

module.exports = {
  friendlyName: 'Test host services with streaming',

  description: 'Test host services and stream results via WebSocket',

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
    let results = {};

    const checkSshBase =
      '/usr/local/bin/check_by_ssh -t 40 -v -F /home/ubuntu/.ssh/config -j';
    const plugins = 'sudo /usr/lib/nagios/plugins/';

    let pId = inputs.projectId;
    let proj = await Project.findOne({id: pId}).populate('parent');
    let projectPath = mainProjectPath(proj);
    let passPath = localPasswordsPath(projectPath);
    if (!fs.existsSync(passPath)) {
      console.error(`Cannot access to pass file in ${passPath}`);
    }
    let passwordsRead = await loadIniFile.sync(passPath);
    let passwords = {};
    for (let partialPass of Object.values(passwordsRead)) {
      Object.assign(passwords, partialPass);
    }

    // Send initial status via WebSocket
    if (this.req.isSocket) {
      sails.sockets.broadcast(this.req.socket.id, 'service-check-start', {
        projectId: pId,
        totalServers: serversIds.length
      });
    }

    try {
      const checkPromises = serversIds.map(async (id) => {
        let s = await Server.findOne({id: id});
        let server = s.name;
        const checks = serverChecks[id];

        // Send server check start event
        if (this.req.isSocket) {
          sails.sockets.broadcast(this.req.socket.id, 'service-check-progress', {
            serverId: id,
            serverName: server,
            status: 'checking'
          });
        }

        let outFile = `${server}-checks.txt`;
        let outFileProdDev = p.join(logsProdDevLocation(), outFile);

        try {
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
              let host = check.host;
              let tcpServiceCmd =
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
                  checkName = '';
                  checkExecutable = 'pgsql';
                  args = `-H 127.0.0.1 -l postgres -p ${passwords['postgresql_password']}| paste -s - - | grep -v '^$'`;
                  break;
                case 'spark':
                  checkExecutable = 'procs';
                  args = `-a 'org.apache.spark.deploy' -C 1`;
                  break;
                case 'hadoop':
                  checkExecutable = 'procs';
                  args = `-a 'org.apache.hadoop' -C 1`;
                  break;
                // Skip these - they're already covered by TCP checks
                case 'nginx':
                case 'tomcat':
                case 'solr':
                case 'elasticsearch':
                case 'cassandra':
                case 'zookeeper':
                case 'cas':
                case 'userdetails':
                case 'apikey':
                case 'cas-management':
                case 'postfix':
                case 'namematching-service':
                case 'doi':
                case 'collectory':
                case 'biocache-service':
                case 'ala-bie':
                case 'bie-index':
                case 'images':
                case 'logger':
                case 'alerts':
                case 'regions':
                case 'spatial-hub':
                case 'spatial-service':
                case 'dashboard':
                case 'sds':
                case 'webapi':
                case 'species-lists':
                case 'events':
                case 'sensitive-data-service':
                case 'data-quality-filter':
                case 'pipelines':
                case 'biocollect':
                case 'ecodata':
                case 'pdfgen':
                  // These services are checked via TCP ports, skip 'other' check
                  checkName = '';
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
              let port = pUrl.port != null && pUrl.port.length > 0 ? pUrl.port : pUrl.protocol === 'http:' ? '80' : '443 -S';
              let pathname = pUrl.pathname;
              if (pathname.includes('/admin/') || pathname.includes('/alaAdmin/')) {
                break;
              }
              // Don't use -I parameter - it expects IP address not hostname
              let urlArgs = `-H ${hostname} -t 40 --sni -f follow -p ${port} -u '${pathname}'`;
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

          console.log(`checks started in ${server}`);
          try {
            await checkAndUpdateDb(cmd, outFileProdDev, results, id, checks, server, true, false, this.req);
            console.log(`<<< End of checks of ${server}`);
          } catch (err) {
            console.error(`Batch check failed for ${server}, trying individual checks...`);
            console.log(`Checking ${server} cmd by cmd as some failed --------------- `);

            // Send individual check status
            if (this.req.isSocket) {
              sails.sockets.broadcast(this.req.socket.id, 'service-check-progress', {
                serverId: id,
                serverName: server,
                status: 'individual-checks'
              });
            }

            let individualCheckCount = 0;
            let individualFailCount = 0;
            for (let i = 0; i < serviceName.length; i++) {
              let svcName = serviceName[i];
              let cmd = `${serverCheckBase} -s ${svcName} -C "${serviceCommand[i]}" -O ${p.join(
                logsProdFolder,
                outFile
              )}`;
              try {
                try {
                  await fs.unlinkSync(outFileProdDev);
                } catch (e) {
                }

                await checkAndUpdateDb(cmd, outFileProdDev, results, id, checks, server, false, false, this.req);
                individualCheckCount++;
              } catch (individualErr) {
                individualFailCount++;
                console.error(`  ✗ Individual check failed for ${server}: ${svcName.split('þ')[2] || 'unknown'}`);
              }
            }
            console.log(`Individual checks for ${server}: ${individualCheckCount} succeeded, ${individualFailCount} failed`);

            if (results[id] && results[id].length > 0) {
              await updateServiceDeployStatus(results[id], checks, server);
              console.log(`<<< End of checks of ${server} (individual mode) - ${results[id].length} results`);

              if (this.req.isSocket) {
                sails.sockets.broadcast(this.req.socket.id, 'service-check-progress', {
                  serverId: id,
                  serverName: server,
                  results: results[id],
                  status: 'completed'
                });
              }
            } else {
              console.error(`No results accumulated for ${server} - all ${individualFailCount} checks failed`);

              if (!results[id]) {
                results[id] = [];
              }

              if (this.req.isSocket) {
                sails.sockets.broadcast(this.req.socket.id, 'service-check-progress', {
                  serverId: id,
                  serverName: server,
                  results: [],
                  status: 'failed'
                });
              }
            }
          }
        }
      });

      const checkResults = await Promise.allSettled(checkPromises);

      let successCount = 0;
      let failedCount = 0;
      checkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failedCount++;
          console.error(`Failed to check server ${serversIds[index]}:`, result.reason);
        }
      });

      console.log(`\n=== Check Summary: ${successCount} servers checked successfully, ${failedCount} failed ===\n`);

      let sds = await ServiceDeploy.find({projectId: pId});
      let ss = await Service.find({projectId: pId});

      // Send final completion event
      if (this.req.isSocket) {
        sails.sockets.broadcast(this.req.socket.id, 'service-check-complete', {
          projectId: pId,
          serviceDeploys: sds,
          services: ss,
          results: results
        });
      }

      console.log(`--- Returning check results for ${Object.keys(results).length} servers`)
      this.res.json({projectId: pId, serviceDeploys: sds, services: ss, results: results});
    } catch (e) {
      console.log(e);

      if (this.req.isSocket) {
        sails.sockets.broadcast(this.req.socket.id, 'service-check-error', {
          error: e.message
        });
      }

      this.res.serverError(e);
    }
  },
};

