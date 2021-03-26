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
  ttydPort: '20110',
};
};
```

### Production configuration

In production, the previous variables are specified in `config/env/production.js`:

```
  sshDir: '/home/ubuntu/.ssh/',
  asshDir: '/home/ubuntu/.ssh/assh.d/',
  projectsDir: '/home/ubuntu/ansible/la-inventories/',
  baseBrandingLocation: '/home/ubuntu/base-branding',
  preCmd: '',
  ttydPort: '2011',

```

And match the directories of the [la-toolkit](https://github.com/living-atlases/la-toolkit/) dockerfiles.
