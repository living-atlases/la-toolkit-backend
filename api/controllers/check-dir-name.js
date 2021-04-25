const p = require('path');
const fs = require('fs');

module.exports = {
  friendlyName: 'Check if dir name is available',

  description: '',

  inputs: {
    dirName: {
      type: 'string',
      description: 'Suggested din name',
      required: true,
    },
    id: {
      type: 'string',
      description: 'project id',
      required: true,
    },
  },

  fn: async function (inputs) {
    const dirName = inputs.dirName;
    const id = inputs.id;
    const projectDir = sails.config.projectsDir;
    let result;
    // Exits that dir?
    //   has same id?
    //     return old dirName
    //   else
    //     return dirName-count not existent
    // else
    //   return dirName

    if (fs.existsSync(p.join(projectDir, dirName))) {
      let yoRc = fs.readFileSync(
        p.join(projectDir, `${dirName}/.yo-rc.json`),
        'utf8'
      );
      let yoRcJ = JSON.parse(yoRc);
      let otherId = yoRcJ['generator-living-atlas']['promptValues']['LA_id'];
      if (id === otherId) {
        // ok, it's the same, we can use the same dirName
        result = dirName;
      } else {
        // find a dirname-num combination that does not exist
        let num = 1;
        result = `${dirName}-${num}`;
        while (fs.existsSync(p.join(projectDir, result))) {
          num += 1;
          result = `${dirName}-${num}`;
        }
      }
    } else {
      result = dirName;
    }
    resultJson = `{ "dirName": "${result}" }`;
    return this.res.json(JSON.parse(resultJson));
  },
};
