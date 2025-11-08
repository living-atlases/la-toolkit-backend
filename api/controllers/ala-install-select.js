const cp = require('child_process');
const {logErr} = require('../libs/utils.js');

const runGitCommand = (command, cwd, preCmd) => {
  const fullCommand = `${preCmd}${command}`;
  console.log(`Executing: ${fullCommand}`);
  const startTime = Date.now();

  const result = cp.spawnSync('sh', ['-c', fullCommand], {
    cwd: cwd,
    stdio: 'inherit',
    env: {...process.env, GIT_TERMINAL_PROMPT: '0'},
    timeout: 300000, // 5 minutes
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
  });

  const endTime = Date.now();
  console.log(`Command completed in ${endTime - startTime}ms`);

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}`);
  }

  return result;
};

const alaInstallSelect = (version) => {
  let preCmd = sails.config.preCmd;
  let alaInstallLocation =
    process.env.NODE_ENV === 'production'
      ? '/home/ubuntu/ansible/ala-install'
      : sails.config.projectDir;
  console.log(`Resulting cwd: ${alaInstallLocation}`);
  try {
    if (preCmd !== '') {
      preCmd = preCmd.replace(
        'exec',
        `exec -w /home/ubuntu/ansible/ala-install`
      );
      preCmd = preCmd + ' ';
    }
    console.log(`Selecting proper ala-install version: ${version}`);

    // Custom mode: skip all git operations, user is editing manually
    if (version === 'custom') {
      console.log('Custom mode: skipping all git operations');
      console.log('End of ala-install git pull');
      return '';
    }

    // For all non-custom versions, update the repository
    console.log('Running git fetch --prune...');
    runGitCommand('git fetch --prune --tags origin', alaInstallLocation, preCmd);

    if (version !== 'upstream' && version !== 'la-develop') {
      // Checkout specific tag with -f to force and discard local changes
      console.log(`Running git checkout -f tags/${version}...`);
      runGitCommand(`git checkout -f tags/${version}`, alaInstallLocation, preCmd);
    } else if (version === 'upstream') {
      // Reset to origin/master to discard local changes
      console.log('Running git reset --hard origin/master...');
      runGitCommand('git reset --hard origin/master', alaInstallLocation, preCmd);
    } else if (version === 'la-develop') {
      // Checkout la-develop with -f to force
      console.log('Running git checkout -f origin/la-develop...');
      runGitCommand('git checkout -f origin/la-develop', alaInstallLocation, preCmd);
    }
    console.log('End of ala-install git pull');
    return '';
  } catch (err) {
    logErr(err);
    return err;
  }
};

module.exports = {
  friendlyName: 'ala-install select',

  description: '',

  inputs: {
    version: {
      type: 'string',
      description: 'the ala-install version',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    gitError: {
      description: 'Error selecting git tags.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs, exits) {
    let out = alaInstallSelect(inputs.version);
    if (out === '') {
      return exits.success();
    } else {
      throw 'gitError';
    }
  },
};
