# la-toolkit-backend

### Development 

Setup your `config/local.js` to something like, to test the `.ssh` keys generation, and `assh` config generation:

```
module.exports = {
  sshDir: '/var/tmp/la-toolkit/.ssh/',
  asshDir: '/var/tmp/la-toolkit/.ssh/assh.d/',
  projectsDir: '/var/tmp/la-toolkit/',
  baseBrandingLocation: '/data/la-generator/base-branding',
  preCmd: 'docker exec -u ubuntu la-toolkit',
};
```

### Production configuration

In production, the previous variables are specified in `config/env/production.js`:

```
  sshDir: '/home/ubuntu/.ssh/',
  asshDir: '/home/ubuntu/.ssh/assh.d/',
  projectsDir: '/home/ubuntu/ansible/la-inventories',
  baseBrandingLocation: '/home/ubuntu/base-branding',
  preCmd: '',
```

And match the directories of the [la-toolkit Dockerfile](https://github.com/living-atlases/la-toolkit/blob/dev/Dockerfile).
