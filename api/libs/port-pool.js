const waitOn = require('wait-on');

const PortPool = function (start, end) {
  this.start = start;
  this.end = end;
};

PortPool.prototype.getNext = async function () {
  port = this.start;
  while (port <= this.end) {
    let waitOnOpts = {
      resources: [
        // `tcp:localhost:${port}`,
        `http-get://localhost:${port}`,
      ],
      timeout: 500,
      reverse: true,
      verbose: false,
      validateStatus: function (status) {
        return status >= 200 && status <= 500; // default if not provided
      },
    };
    try {
      await waitOn(waitOnOpts);
      console.log(`Next ttyd free port: ${port}`);
      break;
    } catch (err) {
      port += 1;
      console.log(`Check next ttyd port ${port}`);
    }
  }
  if (port === this.end + 1) {
    console.error('Failed to get a free port');
    return null;
  }
  return port;
};

module.exports = PortPool;
