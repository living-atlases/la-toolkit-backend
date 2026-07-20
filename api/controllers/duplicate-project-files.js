const p = require('path');
const fs = require('fs');

module.exports = {
  friendlyName: 'Duplicate project files',

  description:
    'Copies the generated passwords and local customizations (local-extras, ' +
    'branding) from a source project directory into a destination one, so a ' +
    'duplicated project reuses them instead of generating fresh ones. ' +
    'Best-effort: missing files/dirs are skipped.',

  inputs: {
    sourceDirName: {
      type: 'string',
      description: 'dirName of the original project',
      required: true,
    },
    destDirName: {
      type: 'string',
      description: 'dirName of the duplicated project',
      required: true,
    },
  },

  fn: async function (inputs) {
    const sourceDirName = inputs.sourceDirName;
    const destDirName = inputs.destDirName;
    const projectDir = sails.config.projectsDir;

    const copied = [];

    // Inventory customization files: reuse the original's passwords and local
    // extras. The inventory.ini itself is intentionally NOT copied (it is
    // regenerated from the toolkit and holds machine IPs).
    const invFiles = [
      'local-passwords',
      'local-extras',
      'spatial-local-extras',
      'cas-local-extras',
    ];
    const srcInvDir = p.join(
      projectDir,
      sourceDirName,
      `${sourceDirName}-inventories`
    );
    const dstInvDir = p.join(
      projectDir,
      destDirName,
      `${destDirName}-inventories`
    );
    for (const suffix of invFiles) {
      const srcFile = p.join(srcInvDir, `${sourceDirName}-${suffix}.ini`);
      const dstFile = p.join(dstInvDir, `${destDirName}-${suffix}.ini`);
      try {
        if (fs.existsSync(srcFile)) {
          fs.mkdirSync(dstInvDir, { recursive: true });
          fs.copyFileSync(srcFile, dstFile);
          copied.push(`${destDirName}-${suffix}.ini`);
        }
      } catch (e) {
        console.log(
          `duplicate-project-files: failed copying ${srcFile} -> ${dstFile}: ${e}`
        );
      }
    }

    // Branding directory (base-branding clone with the site customizations).
    const srcBranding = p.join(
      projectDir,
      sourceDirName,
      `${sourceDirName}-branding`
    );
    const dstBranding = p.join(
      projectDir,
      destDirName,
      `${destDirName}-branding`
    );
    try {
      if (fs.existsSync(srcBranding) && !fs.existsSync(dstBranding)) {
        fs.cpSync(srcBranding, dstBranding, { recursive: true });
        copied.push(`${destDirName}-branding/`);
      }
    } catch (e) {
      console.log(
        `duplicate-project-files: failed copying branding ${srcBranding} -> ${dstBranding}: ${e}`
      );
    }

    return this.res.json({ copied });
  },
};
