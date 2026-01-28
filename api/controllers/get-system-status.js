module.exports = async function getSystemStatus(req, res) {
  return res.json({
    dbUpgradeRequired: sails.config.custom.dbUpgradeRequired || false,
    appName: 'Living Atlases Toolkit',
    // We can add more status info here in the future
  });
};
