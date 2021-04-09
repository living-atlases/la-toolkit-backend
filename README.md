# la-toolkit-backend

### Development 

Setup your `config/local.js` to something like, to test the `.ssh` keys generation, and `assh` config generation:

```
module.exports = {
  sshDir: '/var/tmp/la-toolkit/.ssh/',
  asshDir: '/var/tmp/la-toolkit/.ssh/assh.d/',
  projectsDir: '/var/tmp/la-toolkit/config/',
  logsDir: '/var/tmp/la-toolkit/logs/',
  baseBrandingLocation: '/data/la-generator/base-branding',
  preCmd: 'docker exec -u ubuntu la-toolkit',
  ttydMinPort: 20011,
  ttydMaxPort: 20100,
};
};
```
The ttyd ports configuration should match the la-toolkit docker compose ports configuration.

### Production configuration

In production, the previous variables are specified in `config/env/production.js`:

```
  sshDir: '/home/ubuntu/.ssh/',
  asshDir: '/home/ubuntu/.ssh/assh.d/',
  projectsDir: '/home/ubuntu/ansible/la-inventories/',
  baseBrandingLocation: '/home/ubuntu/base-branding',
  preCmd: '',
  ttydMinPort: 2011,
  ttydMaxPort: 2100,
```

And match the directories of the [la-toolkit](https://github.com/living-atlases/la-toolkit/) dockerfiles.


### Run sails

During development you can run sails with forever to easy reload with code changes

```
npm install -g forever
forever -w app.js
```

Or without `forewer` and `watch` just:


```
sails lift
```
