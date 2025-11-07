const cp = require('child_process');
const util = require('util');
const {logErr} = require('../libs/utils.js');

const execAsync = util.promisify(cp.exec);
// Timeouts: SSH commands through gateways can take longer
const pingTimeout = 15000;  // 15s for ping (includes gateway SSH overhead)
const sshTimeout = 20000;   // 20s for SSH commands (includes gateway overhead)
const defExecTimeout = sshTimeout;

const log = (preCmd, cmd) => {
  console.log(`test-connectivity:\npreCmd: ${preCmd}\ncmd: ${cmd}`);
};

const asshReConfig = async () => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    let cmd = `${preCmd}bash -c "/usr/local/bin/assh config build > /home/ubuntu/.ssh/config"`;
    log(preCmd, cmd);
    await execAsync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });
    return '';
  } catch (err) {
    logErr(err);
    return err.message || err.toString();
  }
};

const pingTest = async (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  if (server.gateways.length > 0) {
    let gw = await Server.findOne({id: server.gateways[0], projectId: server.projectId})
    if (!gw) {
      throw Error(`Wrong gw: ${server.gateways[0]}`);
    }
    preCmd = `${preCmd}ssh -T ${gw.name} `;
  }

  let cmd = `${preCmd}ping -w 3 -c 1 ${server.ip}`;
  log(preCmd, cmd);

  return new Promise((resolve, reject) => {
    cp.exec(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: pingTimeout,  // Use longer timeout for ping through gateways
    }, (error, stdout, stderr) => {
      // Log the ping result for debugging
      console.log(`Ping command result for ${server.name} (${server.ip}):`, {
        stdout: stdout || '(empty)',
        stderr: stderr || '(empty)',
        exitCode: error ? error.code : 0,
      });

      // If there's an error object, ping failed
      if (error) {
        console.log(`❌ Ping failed for ${server.name}: exit code ${error.code}`);
        logErr(error);
        resolve(error.message || error.toString());
        return;
      }

      // If both stdout and stderr are empty, ping command didn't execute properly
      if ((!stdout || stdout.trim().length === 0) &&
          (!stderr || stderr.trim().length === 0)) {
        console.log(`❌ Ping detected as failed for ${server.name}: no output returned`);
        const errMsg = 'Ping failed: command returned no output (likely failed to execute)';
        logErr(new Error(errMsg));
        resolve(errMsg);
        return;
      }

      // Validate ping output
      if (stdout || stderr) {
        const output = (stdout + ' ' + stderr).toLowerCase();
        if (output.includes('destination') && (output.includes('unreachable') || output.includes('host unreachable') || output.includes('net unreachable')) ||
            output.includes('100% packet loss') ||
            (output.includes('0 received') && output.includes('transmitted'))) {
          console.log(`❌ Ping detected as failed for ${server.name}: output contains failure indicators`);
          const errMsg = 'Ping failed: destination unreachable or 100% packet loss';
          logErr(new Error(errMsg));
          resolve(errMsg);
          return;
        }
      }

      console.log(`✅ Ping succeeded for ${server.name}`);
      resolve('');
    });
  });
};

const sshTest = async (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  async function sshTestAsUser() {
    let cmd = `${preCmd}ssh -T ${server.name} hostname`;
    log(preCmd, cmd);
    try {
      const result = await execAsync(cmd, {
        cwd: sails.config.sshDir,
        shell: "/bin/bash",
        timeout: defExecTimeout,
      });
      console.log(`SSH command result for ${server.name}:`, {
        stdout: result.stdout ? result.stdout.substring(0, 100) : '(empty)',
        stderr: result.stderr ? result.stderr.substring(0, 100) : '(empty)',
      });

      // Check for SSH errors in stderr even if exit code is 0
      if (result.stderr) {
        const lowerStderr = result.stderr.toLowerCase();
        if (lowerStderr.includes('connection refused') ||
            lowerStderr.includes('connection closed') ||
            lowerStderr.includes('no route to host') ||
            lowerStderr.includes('stdio forwarding failed') ||
            lowerStderr.includes('failed to use') ||
            lowerStderr.includes('no such available gateway') ||
            lowerStderr.includes('kex_exchange_identification')) {
          throw new Error(`SSH error in stderr: ${result.stderr}`);
        }
      }

      // hostname command should return something (the hostname)
      // If stdout is empty, the command didn't execute properly
      if (!result.stdout || result.stdout.trim().length === 0) {
        throw new Error('SSH command returned empty output - command did not execute properly');
      }

      return '';
    } catch (err) {
      console.log(`SSH command failed for ${server.name}:`, {
        code: err.code,
        signal: err.signal,
        message: err.message.substring(0, 200),
      });
      throw err;
    }
  }

  // Try with default user
  try {
    const result = await sshTestAsUser();
    console.log(`✅ SSH test succeeded for ${server.name} (attempt 1)`);
    return result;
  } catch (err) {
    console.warn(`❌ SSH attempt 1 failed for ${server.name}, retrying...`);
    logErr(err);
  }

  // Retry once more with default user
  try {
    const result = await sshTestAsUser();
    console.log(`✅ SSH test succeeded for ${server.name} (attempt 2)`);
    return result;
  } catch (err) {
    console.warn(`❌ SSH attempt 2 failed for ${server.name} - ALL ATTEMPTS FAILED`);
    logErr(err);
    return err.message || err.toString();
  }
};

const sudoTest = async (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    let cmd = `${preCmd}ssh -T ${server.name} sudo hostname`;
    log(preCmd, cmd);
    const result = await execAsync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });

    // Check for SSH errors in stderr even if exit code is 0
    if (result.stderr) {
      const lowerStderr = result.stderr.toLowerCase();
      if (lowerStderr.includes('connection refused') ||
          lowerStderr.includes('connection closed') ||
          lowerStderr.includes('no route to host') ||
          lowerStderr.includes('stdio forwarding failed') ||
          lowerStderr.includes('failed to use') ||
          lowerStderr.includes('no such available gateway') ||
          lowerStderr.includes('kex_exchange_identification')) {
        throw new Error(`SSH error in stderr: ${result.stderr}`);
      }
    }

    return '';
  } catch (err) {
    logErr(err);
    return err.message || err.toString();
  }
};

const osVersionTest = async (server) => {
  let preCmd = sails.config.preCmd;
  if (preCmd !== '') {
    preCmd = preCmd + ' ';
  }

  try {
    let cmd = `${preCmd}ssh -T ${server.name} sudo cat /etc/os-release | egrep "^NAME=|^VERSION_ID=" | sed 's/=/:/' | sed 's/^NAME:/{"name":/' | sed 's/VERSION_ID:/"version":/' |  sed '1 s/$/,/' | sed '$ s/$/}/'`;
    log(preCmd, cmd);
    const {stdout} = await execAsync(cmd, {
      cwd: sails.config.sshDir,
      shell: "/bin/bash",
      timeout: defExecTimeout,
    });
    return stdout;
  } catch (err) {
    logErr(err);
    return err.message || err.toString();
  }
};

module.exports = {
  friendlyName: 'Check connectivity',

  description: '',

  inputs: {
    servers: {
      type: 'json',
      description: 'A servers list to test connectivity',
      required: true,
      custom: function (value) {
        return _.isObject(value);
      },
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    let resultJson = {};
    let updatedServers = [];

    await asshReConfig();

    const testServers = inputs.servers;
    // TEMPORARY: Filter to test with only 3 servers
    /* const testServers = inputs.servers.filter(s =>
      s.name === 'index.gbif.es' ||
      s.name === 'gbif-es-nameserver-2024-1' ||
      s.name === 'gbif-es-pipelines-2022-1'
    );
    console.log(`🧪 TESTING MODE: Testing only ${testServers.length} servers: ${testServers.map(s => s.name).join(', ')}`); */

    // Process all servers in parallel using Promise.all for better performance
    const serverPromises = testServers.map(async (server) => {
      const serverResult = {};
      serverResult[server.name] = {};

      let pingOut = await pingTest(server);
      serverResult[server.name]['ping'] = pingOut.length === 0;
      serverResult[server.name]['out'] = pingOut;

      let sshOut = await sshTest(server);
      serverResult[server.name]['out'] =
        serverResult[server.name]['out'] + '\n' + sshOut;
      serverResult[server.name]['ssh'] = sshOut.length === 0;

      // Only test sudo if SSH works
      let sudoOut = '';
      if (serverResult[server.name]['ssh']) {
        sudoOut = await sudoTest(server);
        serverResult[server.name]['sudo'] = sudoOut.length === 0;
        serverResult[server.name]['out'] =
          serverResult[server.name]['out'] + '\n' + sudoOut;
      } else {
        console.log(`⏭️  Skipping sudo test for ${server.name} (SSH failed)`);
        serverResult[server.name]['sudo'] = false;
        serverResult[server.name]['out'] =
          serverResult[server.name]['out'] + '\nSkipped sudo test (SSH failed)';
      }

      // Only test OS version if sudo works
      let osVersionOut = '';
      if (serverResult[server.name]['sudo']) {
        osVersionOut = await osVersionTest(server);
      } else {
        console.log(`⏭️  Skipping OS version test for ${server.name} (sudo not available)`);
        osVersionOut = '';
      }
      try {
        // Only try to parse if it's valid JSON (no error string)
        if (osVersionOut.length !== 0 && osVersionOut.trim().startsWith('{')) {
          const parsed = JSON.parse(osVersionOut);
          serverResult[server.name]['os'] = {
            name: parsed.name || '',
            version: parsed.version || ''
          };
        } else {
          serverResult[server.name]['os'] = {name: '', version: ''};
        }
      } catch (e) {
        console.warn(`Failed to parse OS version for ${server.name}: ${e.message}`);
        serverResult[server.name]['os'] = {name: '', version: ''};
      }

      let updatedServer = await Server.updateOne({id: server.id}).set(
        {
          reachable: serverResult[server.name]['ping'] ? 'success' : 'failed',
          sshReachable: serverResult[server.name]['ssh'] ? 'success' : 'failed',
          sudoEnabled: serverResult[server.name]['sudo'] ? 'success' : 'failed',
          osName: serverResult[server.name]['os'].name,
          osVersion: serverResult[server.name]['os'].version,
        });

      // Log the results for debugging
      console.log(`Server ${server.name}: ping=${serverResult[server.name]['ping']}, ssh=${serverResult[server.name]['ssh']}, sudo=${serverResult[server.name]['sudo']}`);

      // Warning if SSH/sudo succeed but ping fails (possible misconfiguration)
      if (!serverResult[server.name]['ping'] && (serverResult[server.name]['ssh'] || serverResult[server.name]['sudo'])) {
        console.warn(`⚠️  ${server.name}: SSH/sudo work but ping fails - this server might not exist or ping is filtered`);
      }

      if (!updatedServer) {
        console.warn(`Failed to update server ${server.name} (${server.id}) in database`);
        // Return the server with updated status even if DB update failed
        updatedServer = {
          ...server,
          reachable: serverResult[server.name]['ping'] ? 'success' : 'failed',
          sshReachable: serverResult[server.name]['ssh'] ? 'success' : 'failed',
          sudoEnabled: serverResult[server.name]['sudo'] ? 'success' : 'failed',
          osName: serverResult[server.name]['os'].name,
          osVersion: serverResult[server.name]['os'].version,
        };
      }

      return {
        result: serverResult,
        updatedServer: updatedServer
      };
    });

    // Wait for all server tests to complete in parallel
    const results = await Promise.all(serverPromises);

    // Merge all results
    for (const {result, updatedServer} of results) {
      Object.assign(resultJson, result);
      updatedServers.push(updatedServer);
    }

    resultJson.servers = updatedServers;

    // Log the final response for debugging
    console.log('=== CONNECTIVITY TEST RESULTS ===');
    console.log(`Total servers tested: ${updatedServers.length}`);
    for (const srv of updatedServers) {
      console.log(`  ${srv.name}: reachable=${srv.reachable}, ssh=${srv.sshReachable}, sudo=${srv.sudoEnabled}`);
    }
    console.log('=================================');

    return this.res.json(resultJson);
  }
};
