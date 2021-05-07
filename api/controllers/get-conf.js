module.exports = async function getAppConf(req, res) {
  let projects = await sails.helpers.populateProject.with({
    query: {
      sort: 'createdAt DESC',
    },
  });

  return res.json({ projects: projects });
};
