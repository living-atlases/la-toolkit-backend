const p = require('path');
const fs = require('fs');
const sails = require('sails');

const logsProdFolder = '/home/ubuntu/ansible/logs/';
const logsFile = (folder, prefix, suffix, colorized = false, type = "ansible") =>
  p.join(
    folder,
    `${prefix}-${type}-${colorized ? 'colorized-' : ''}${suffix}.log`
  );
const resultsFile = (prefix, suffix) => `${prefix}-results-${suffix}.json`;
const exitCodeFile = (folder, prefix, suffix) =>
  p.join(folder, `${prefix}-exit-${suffix}.out`);
const appConf = () => `${sails.config.projectsDir}la-toolkit-conf.json`;

const logsProdDevLocation = () =>
  process.env.NODE_ENV === 'production'
    ? logsProdFolder
    : `${sails.config.logsDir}`;
const defExecTimeout = 20000;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const sailsLoadSync = () => {
  return new Promise((resolve, reject) => {
    sails.load(
      {
        hooks: {
          // without this the db-migrate task doesn't stops
          session: false,
        },
      },
      (err) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        resolve();
      }
    );
  });
};

const appConfSync = async () => {
  await sailsLoadSync()
  if (fs.existsSync(appConf())) {
    let conf = await fs.readFileSync(appConf(), 'utf8');
    return JSON.parse(conf);
  } else {
    return {
      'projects': [],
      'projectsMap': {}
    };
  }
};

const logErr = (err) => {
  console.error(
    err.output != null && err.output[1] != null
      ? err.output[1].toString()
      : err.toString()
  );
  if (err.status != null) console.error(`exit code: ${err.status}`);
}

const logsTypeF = (cmdType) => {
  let isBrandingDeploy = cmdType === 'brandingDeploy';
  let isLAPipelines = cmdType === 'laPipelines'
  let isBashCmd = cmdType === 'bash' || isLAPipelines || isBrandingDeploy;
  return isBrandingDeploy ? "branding-deploy" : isLAPipelines ? "la-pipelines" : isBashCmd ? "bash" : "ansible";
}

const isBashCmdF = (cmdType) => {
  let isBrandingDeploy = cmdType === 'brandingDeploy';
  let isLAPipelines = cmdType === 'laPipelines'
  return cmdType === 'bash' || isLAPipelines || isBrandingDeploy;
}

const dateSuffix = () => {
  let now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19)
    .replace('T', '_');
}

module.exports = {
  logsProdFolder,
  logsFile,
  resultsFile,
  exitCodeFile,
  logsProdDevLocation,
  appConf,
  defExecTimeout,
  delay,
  sailsLoadSync,
  appConfSync,
  logErr,
  dateSuffix,
  logsTypeF,
  isBashCmdF
};
