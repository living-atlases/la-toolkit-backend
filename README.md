# la-toolkit-backend

### Development 

Setup your `config/local.js` to something like, to test the `.ssh` keys generation, and `assh` config generation:

```
module.exports = {
  sshDir: '/data/la-toolkit/.ssh/',
  asshDir: '/data/la-toolkit/.ssh/assh.d/',
  projectsDir: '/data/la-toolkit/config/',
  logsDir: '/data/la-toolkit/logs/',
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

First of all setup a pair of environment variables with your mongo user/password:

```bash
export DATABASE_URL=mongodb://la_toolkit_user:la_toolkit_changeme@localhost:27017/la_toolkit
```
that should match [the same varibles in your la-toolkit docker-compose.yml](https://github.com/living-atlases/la-toolkit/blob/master/docker-compose.yml) if you change them.

During development you can run sails with forever to easy reload with code changes

```bash
npm install -g forever
forever -w app.js
```

Or without `forewer` and `watch` just:


```bash
sails lift
```
