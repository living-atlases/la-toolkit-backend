const invBase = '/home/ubuntu/ansible/la-inventories/';

const addInvRelativePath = (projectPath, addInv) => {
  return `${projectPath}/${projectPath}-${addInv}/`;
}

let addInvAbsPath = (projectPath, addInv) => {
  return `${invBase}${addInvRelativePath(projectPath, addInv)}`;
}

let mainInvPath = (projectPath) => {
  return `${sails.config.projectsDir}/${projectPath}/${projectPath}-inventories/${projectPath}-inventory.ini`;
}

let localPasswordsPath = (projectPath) => {
  return `${sails.config.projectsDir}/${projectPath}/${projectPath}-inventories/${projectPath}-local-passwords.ini`;
}

let deployBrandingPath = (projectPath) => {
  return addInvAbsPath(projectPath, 'branding');
}

module.exports = {
  invBase,
  addInvRelativePath,
  addInvAbsPath,
  mainInvPath,
  localPasswordsPath,
  deployBrandingPath
};
