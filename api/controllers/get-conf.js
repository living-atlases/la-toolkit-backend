module.exports = async function getAppConf(req, res) {
  let projects = await sails.helpers.populateProject();
  return res.json({ projects: projects });
};
