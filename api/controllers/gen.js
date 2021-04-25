const tmp = require('tmp');
const archiver = require('archiver');
const fs = require('fs');

module.exports = {
  friendlyName: 'Generate and Download',

  description: 'Generate the LA inventories and send to the user',

  inputs: {
    id: {
      description: 'the id to process',
      type: 'string',
      required: true,
      /* custom: async function (uuid) {
         return await Conf.findOne({ uuid: uuid });
         }, */
    },
    download: {
      description: 'just gen and download',
      type: 'boolean',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
    fsError: {
      description: 'FS error generating your inventories.',
      responseType: 'serverError',
    },
    genError: {
      description: 'Error generating your inventories.',
      responseType: 'serverError',
    },
    zipError: {
      description: 'Error archiving your inventories.',
      responseType: 'serverError',
    },
  },

  fn: async function (inputs, exits) {
    // temporal directory
    const tmpobj = tmp.dirSync({ unsafeCleanup: true });

    let p = await Project.findOne({ id: inputs.id });

    const yoRc = sails.helpers.transform({ conf: p.genConf });

    console.log(yoRc);

    const pkgName = p.dirName;

    const path = inputs.download
      ? tmpobj.name
      : `${sails.config.projectsDir}${pkgName}`;

    if (!inputs.download && !fs.existsSync(path)) {
      fs.mkdirSync(path);
    }

    await sails.helpers.yoGen(pkgName, path, yoRc);

    if (inputs.download) {
      let res = this.res;

      // set the archive name
      res.attachment(`${pkgName}-inventories-and-theme.zip`);

      // https://github.com/archiverjs/node-archiver/blob/master/examples/express.js
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      console.log('Starting to zip');
      archive.on('error', (err) => {
        console.log(err.message);
        throw 'zipError';
      });

      //on stream closed we can end the request
      archive.on('end', () => {
        console.log('Archive wrote %d bytes', archive.pointer());
        // Manual temporal dir cleanup
        tmpobj.removeCallback();
      });

      var files = [];
      for (var i in files) {
        archive.file(files[i], { name: p.basename(files[i]) });
      }

      var directories = [path];
      for (var i in directories) {
        archive.directory(directories[i], directories[i].replace(path, ''));
      }

      archive.finalize();

      return res;
    } else {
      return exits.success();
    }
  },
};
