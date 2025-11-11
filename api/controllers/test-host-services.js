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

let checkAndUpdateDb = async (cmd, outFileProdDev, results, id, checks, server, updateDb = true, debug = false) => {
  let fullcmd = `${preCmd}${cmd}`;
  if (debug) console.log(`check_by_ssh start for ${server}`)

  try {
    // Use async exec instead of execSync to avoid blocking the event loop
    await new Promise((resolve, reject) => {
      cp.exec(fullcmd, {
        cwd: sails.config.sshDir,
        timeout: defExecTimeout,
      }, (error, stdout, stderr) => {
        if (error) {
          // Log full stderr for debugging SSH issues
          if (stderr && stderr.trim().length > 0) {
            console.error(`      SSH stderr for ${server}:`);
            console.error(stderr);
          }
          // Also log stdout in case there's useful info
          if (stdout && stdout.trim().length > 0) {
            console.error(`      SSH stdout for ${server}:`);
            console.error(stdout.substring(0, 500));
          }
          // Attach stdout/stderr to error for later detection
          const err = new Error(`check_by_ssh failed for ${server}: ${error.message.split('\n')[0]}`);
          err.stdout = stdout;
          err.stderr = stderr;
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (execError) {
    // Preserve stdout/stderr in the error
    const err = new Error(`SSH execution failed for ${server}: ${execError.message}`);
    err.stdout = execError.stdout;
    err.stderr = execError.stderr;
    throw err;
  }

  // Verify file exists before reading
  if (!fs.existsSync(outFileProdDev)) {
    throw new Error(`Output file not found for ${server}: ${outFileProdDev}`);
  }

  let outS = await fs.readFileSync(outFileProdDev).toString();

  if (!outS || outS.trim().length === 0) {
    throw new Error(`Empty output file for ${server}`);
  }

  // console.log(outS.toString());
  // console.log(`check_by_ssh end and output ready for ${server}`)
  // console.log(`ssh checks completed in ${server}`);

  let checksRes = await csvToJson(outS);
  if (debug) console.log(`checks converted in ${server}`);

  // Accumulate results instead of overwriting
  if (!results[id]) {
    results[id] = checksRes;
  } else {
    // Append to existing results
    results[id] = results[id].concat(checksRes);
  }

  // Only update DB if requested (not for individual fallback checks)
  if (updateDb) {
    await updateServiceDeployStatus(results[id], checks, server, debug);
  }
};

// Separate function to update DB from accumulated results
let updateServiceDeployStatus = async (checksResults, checks, server, debug = false) => {
  let sdStatus = {};
  // let sStatus = {};
  for await (let checkRes of checksResults) {
    // console.log(checkRes);
    // console.log(checks[checkRes.checkId]);
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
    // NOTE: Do NOT use -v (verbose) - it causes "Error parsing output" because
    // debug info gets mixed with the actual check output and breaks parsing
    const checkSshBase =
      '/usr/local/bin/check_by_ssh -t 40 -F /home/ubuntu/.ssh/config -j';
    const plugins = 'sudo /usr/lib/nagios/plugins/';
    //  -H ala-install-test-1 -n ala-1 -s uptime:uptime:mysql:https -C uptime -C uptime -C 'sudo /usr/lib/nagios/plugins/check_mysql' -C '/usr/lib/nagios/plugins/check_tcp -H localhost -p 443'

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
      // We join all:vars with cas:vars, etc, to get mongo password for instance
      Object.assign(passwords, partialPass);
    }

    try {
      const checkPromises = serversIds.map(async (id) => {
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
            console.log(`    Total checks to process: ${checkIds.length}`);
            for await (const checkId of checkIds) {
              let check = checks[checkId];
              let type = check.type;
              let checkServiceName = check.name;
              console.log(`    Processing check: ${checkServiceName} (type: ${type}, args: ${check.args})`);
              switch (type) {
                case "tcp":
                  let host = check.host; // parseInt(check.args) === 8983 || parseInt(check.args) === 9000 ? server : "localhost";
                  let tcpServiceCmd =
                    // -r, --refuse=ok|warn|crit
                    `${plugins}check_tcp -H ${host} -r crit -p ${check.args}`;
                  serviceName.push(`${checkId}þ${checkServiceName}þcheck_tcpþ${check.args}þ${Base64.encode(tcpServiceCmd)}`);
                  serviceCommand.push(tcpServiceCmd);
                  console.log(`      → TCP check added: port ${check.args} on ${host}`);
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
                    case 'spark':
                      checkExecutable = 'procs';
                      // Check if Spark master or worker process is running
                      args = `-a 'org.apache.spark.deploy' -C 1`;
                      break;
                    case 'hadoop':
                      checkExecutable = 'procs';
                      // Check if Hadoop NameNode or DataNode process is running
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
                      console.log(`      → OTHER check SKIPPED (${check.args}): already checked via TCP`);
                      checkName = '';
                      break;
                    default:
                      console.log(`      → No tests properly configured for ${check.args}`)
                      checkName = '';
                  }
                  if (checkName !== '') {
                    let otherServiceCmd = `(set -o pipefail && ${plugins}check_${checkExecutable} ${args})`;
                    serviceName.push(`${checkId}þ${checkServiceName}þcheck_${checkName}þþ${Base64.encode(otherServiceCmd)}`);
                    serviceCommand.push(otherServiceCmd);
                    console.log(`      → OTHER check added: ${checkName} (${checkExecutable})`);
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
                    console.log(`      → URL check SKIPPED (admin path): ${url}`);
                    // skip
                    break;
                  }
                  // Don't use -I parameter - it expects IP address not hostname
                  // The checks are executed FROM the server via SSH, so hostname resolution works fine
                  let urlArgs = `-H ${hostname} -t 40 --sni -f follow -p ${port} -u '${pathname}'`;
                  let urlServiceCmd = `${plugins}check_http ${urlArgs}`;
                  serviceName.push(`${checkId}þ${checkServiceName}þcheck_urlþ${Base64.encode(url)}þ${Base64.encode(urlServiceCmd)}`);
                  serviceCommand.push(urlServiceCmd);
                  console.log(`      → URL check added: ${url}`);
                  break;
                default:
                  break;
              }
            }

            if (serviceName.length > 0 && serviceCommand.length > 0) {
              // PRE-CHECK: Verify monitoring tools are installed before running checks
              console.log(`>>> Pre-checking monitoring tools on ${server}...`);
              const preCheckCmd = `docker exec -u ubuntu la-toolkit ssh -F /home/ubuntu/.ssh/config ${server} "ls /usr/lib/nagios/plugins/check_tcp"`;

              try {
                await new Promise((resolve, reject) => {
                  cp.exec(preCheckCmd, {
                    cwd: sails.config.sshDir,
                    timeout: 10000, // 10 second timeout for pre-check
                  }, (error, stdout, stderr) => {
                    if (error) {
                      // Plugin doesn't exist or SSH failed
                      const errorMsg = (stderr || stdout || error.message).toLowerCase();
                      if (errorMsg.includes('no such file') ||
                          errorMsg.includes('cannot access') ||
                          errorMsg.includes('not found')) {
                        console.warn(`⚠️  ${server}: Monitoring tools (Nagios plugins) NOT FOUND`);
                        reject(new Error('MONITORING_TOOLS_NOT_FOUND'));
                      } else {
                        // Other SSH error (connection, permission, etc)
                        console.warn(`⚠️  ${server}: Pre-check failed - ${errorMsg.substring(0, 100)}`);
                        reject(new Error('SSH_PRE_CHECK_FAILED'));
                      }
                    } else {
                      // Plugin exists!
                      console.log(`    ✓ Monitoring tools found on ${server}`);
                      resolve();
                    }
                  });
                });
              } catch (preCheckError) {
                // Pre-check failed - mark as missing monitoring tools
                console.warn(`    Run pre-deploy to install monitoring tools`);
                if (!results[id]) results[id] = [];
                results['_monitoring_' + id] = {
                  monitoringToolsInstalled: false,
                  serverName: server,
                  error: 'Monitoring tools not installed. Run pre-deploy step.'
                };
                console.log(`<<< Skipping checks for ${server} - monitoring tools not installed`);
                return; // Skip this server
              }

              // Monitoring tools exist, proceed with checks
              // Remove any old monitoring warning if it exists from previous runs
              if (results['_monitoring_' + id]) {
                delete results['_monitoring_' + id];
              }

              let cmd = `${serverCheckBase} -s ${serviceName.join(
                ':'
              )} \\\n -C "${serviceCommand.join('" \\\n -C "')}" -O ${p.join(
                logsProdFolder,
                outFile
              )}`;

              console.log(`checks started in ${server}`);
              console.log(`    Total checks to execute: ${serviceName.length}`);
              console.log(`    Command preview: ${cmd.substring(0, 200)}...`);
              try {
                await checkAndUpdateDb(cmd, outFileProdDev, results, id, checks, server, true);
                console.log(`<<< End of checks of ${server}`);
              } catch (err) {
                // Process typical batch check failures by trying individual checks
                // Note: We no longer detect "monitoring tools not found" here because
                // the pre-check with 'ls' already handles that before we get here
                console.error(`Batch check failed for ${server}, trying individual checks...`);
                console.error(`    Batch error: ${err.message}`);
                console.log(`Checking ${server} cmd by cmd as some failed --------------- `);
                // Execute individual checks sequentially to avoid file conflicts
                let individualCheckCount = 0;
                let individualFailCount = 0;
                for (let i = 0; i < serviceName.length; i++) {
                  let svcName = serviceName[i];
                  let svcParts = svcName.split('þ');
                  let checkType = svcParts[2] || 'unknown';
                  console.log(`    Individual check ${i + 1}/${serviceName.length}: ${checkType}`);
                  let cmd = `${serverCheckBase} -s ${svcName} -C "${serviceCommand[i]}" -O ${p.join(
                    logsProdFolder,
                    outFile
                  )}`;
                  try {
                    // Don't update DB for individual checks, will update at the end
                    await checkAndUpdateDb(cmd, outFileProdDev, results, id, checks, server, false);
                    individualCheckCount++;
                    console.log(`      ✓ Success`);
                  } catch (individualErr) {
                    individualFailCount++;
                    // Only log once per individual check, not the full error
                    console.error(`      ✗ Individual check failed for ${server}: ${checkType} - ${individualErr.message}`);
                  }
                }
                console.log(`Individual checks for ${server}: ${individualCheckCount} succeeded, ${individualFailCount} failed`);

                // Now update DB with all accumulated results
                if (results[id] && results[id].length > 0) {
                  await updateServiceDeployStatus(results[id], checks, server);
                  console.log(`<<< End of checks of ${server} (individual mode)`);
                } else {
                  console.error(`No results accumulated for ${server}`);
                }
              }
            }
          }
        );

      // Use Promise.allSettled instead of Promise.all to prevent one failed server from stopping all checks
      const checkResults = await Promise.allSettled(checkPromises);

      // Log results summary
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
      console.log(`--- Returning check results for ${Object.keys(results).length} servers`)
      this.res.json({projectId: pId, serviceDeploys: sds, services: ss, results: results});
    } catch (e) {
      console.log(e);
      this.res.serverError(e);
    }
  },
};
