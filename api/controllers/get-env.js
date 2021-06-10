module.exports = async function getEnv(req, res) {
  return res.json({
    SENTRY_DSN: process.env.TOOLKIT_SENTRY_DSN != null ? process.env.TOOLKIT_SENTRY_DSN : "SOME_DSN",
    DEMO: false,
    BACKEND: process.env.TOOLKIT_PUBLIC_URL != null ? process.env.TOOLKIT_PUBLIC_URL : "localhost:2010",
    HTTPS: process.env.TOOLKIT_HTTPS != null ? process.env.TOOLKIT_HTTPS === 'true' : false,
    TERM_PROXY: process.env.TOOLKIT_TERM_PROXY != null ? process.env.TOOLKIT_TERM_PROXY === 'true' : false
  });
};
