const invBase = '/home/ubuntu/ansible/la-inventories/';

const addInvRelativePath = (projectPath, addInv) => {
  return `${projectPath}/${projectPath}-${addInv}/`;
}

let addInvAbsPath = (invDir, projectPath, addInv) => {
  return `${invBase}${addInvRelativePath(projectPath, addInv)}`;
}

let mainInvPath = (projectPath) => {
  return `${sails.config.projectsDir}/${projectPath}/${projectPath}-inventories/${projectPath}-inventory.ini`;
}

let localPasswordsPath = (projectPath) => {
  return `${sails.config.projectsDir}/${projectPath}/${projectPath}-inventories/${projectPath}-local-passwords.ini`;
}

module.exports = {
  invBase,
  addInvRelativePath,
  addInvAbsPath,
  mainInvPath,
  localPasswordsPath
};
