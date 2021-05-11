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
    // If we generate a project with the same ID we can get a similar dirname so we check if exits
    //
    // Exits that dir?
    //   has same id?
    //     return old dirName
    //   else
    //     return dirName-count not existent
    // else
    //   return dirName
    let yoRcPath = p.join(projectDir, `${dirName}/.yo-rc.json`);
    if (fs.existsSync(p.join(projectDir, dirName)) && fs.existsSync(yoRcPath)) {
      let yoRc = fs.readFileSync(yoRcPath, 'utf8');

      let yoRcJ = JSON.parse(yoRc);
      let otherId = yoRcJ['generator-living-atlas']['promptValues']['LA_id'];
      if (otherId == null || id === otherId) {
        // Id == null when migrating from uuid
        // ok, it's the same, we can use the same dirName"
        result = dirName;
      } else {
        // Let's find a dirname-num combination that does not exist
        let num = 1;
        result = `${dirName}-${num}`;
        while (fs.existsSync(p.join(projectDir, result))) {
          num += 1;
          result = `${dirName}-${num}`;
        }
        // update Project with new dirname
        console.log(
          `Old dirname '${dirName}' is in use by a project with a different id '${otherId}', so selecting a new dirname '${result}'`
        );
        await Project.updateOne({ id: id }).set({ dirName: result });
      }
    } else {
      result = dirName;
    }
    resultJson = `{ "dirName": "${result}" }`;
    return this.res.json(JSON.parse(resultJson));
  },
};
