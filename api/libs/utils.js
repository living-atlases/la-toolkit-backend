const p = require('path');
const fs = require('fs');
const sails = require('sails');

const logsProdFolder = '/home/ubuntu/ansible/logs/';
const logsFile = (folder, prefix, suffix, colorized = false) =>
  p.join(
    folder,
    `${prefix}-ansible-${colorized ? 'colorized-' : ''}${suffix}.log`
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
  await sailsLoadSync();
  let conf = await fs.readFileSync(appConf(), 'utf8');
  return JSON.parse(conf);
};

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
};
