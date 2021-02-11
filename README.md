# la-toolkit-backend


### Development 

Setup your `config/local.js` to something like, to test the `.ssh` keys generation, and `assh` config generation:
```
module.exports = {
  // Any configuration settings may be overridden below, whether it's built-in Sails
  // options or custom configuration specifically for your app (e.g. Stripe, Sendgrid, etc.)
  sshDir: '/var/tmp/la-toolkit/.ssh/',
  asshDir: '/var/tmp/la-toolkit/.ssh/assh.d/',
};
```
