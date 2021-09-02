const invBase = '/home/ubuntu/ansible/la-inventories/';

const addInvRelativePath = (mainProjectPath, projectPath, addInv) => {
  return `${mainProjectPath}/${projectPath}-${addInv}/`;
}

let addInvAbsPath = (mainProjectPath, projectPath, addInv) => {
  return `${invBase}${addInvRelativePath(mainProjectPath, projectPath, addInv)}`;
}

let mainInvPath = (projectPath) => {
  return `${sails.config.projectsDir}/${projectPath}/${projectPath}-inventories/${projectPath}-inventory.ini`;
}

let localPasswordsPath = (projectPath) => {
  return `${sails.config.projectsDir}/${projectPath}/${projectPath}-inventories/${projectPath}-local-passwords.ini`;
}

let mainProjectPath = (p) => p.isHub ? p.parent[0].dirName : p.dirName;
let projectPath = (p) => p.dirName;

let deployBrandingPath = (mainProjectPath, projectPath) => {
  return addInvAbsPath(mainProjectPath, projectPath, 'branding');
}

module.exports = {
  invBase,
  addInvRelativePath,
  addInvAbsPath,
  mainInvPath,
  localPasswordsPath,
  deployBrandingPath,
  mainProjectPath,
  projectPath,
};
