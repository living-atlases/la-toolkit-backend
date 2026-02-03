const test = require('ava');
const transform = require('../api/libs/transform.js');
const validate = require('../api/libs/validate.js');
const sails = require('sails');
const { delay } = require('../api/libs/utils.js');

const {
  domainRegexp,
  hostnameRegexp,
} = require('../api/libs/regexp.js');

const defObj = {
  LA_project_name: 'Atlas of Living Australia',
  LA_project_shortname: 'ALA',
  LA_domain: 'ala.org.au',
  LA_enable_ssl: true,
  LA_use_spatial: true,
  LA_use_ala_bie: true,
  LA_use_regions: true,
  LA_use_species_lists: true,
  LA_use_cas: true,
  LA_use_webapi: false,
  LA_use_alerts: true,
  LA_use_doi: true,
  LA_use_dashboard: true,
  LA_collectory_uses_subdomain: true,
  LA_ala_hub_uses_subdomain: true,
  LA_biocache_service_uses_subdomain: true,
  LA_ala_bie_uses_subdomain: true,
  LA_bie_index_uses_subdomain: true,
  LA_images_uses_subdomain: true,
  LA_species_lists_uses_subdomain: true,
  LA_regions_uses_subdomain: true,
  LA_logger_uses_subdomain: true,
  LA_solr_uses_subdomain: true,
  LA_webapi_uses_subdomain: true,
  LA_spatial_uses_subdomain: true,
  LA_alerts_uses_subdomain: true,
  LA_doi_uses_subdomain: true,
  LA_dashboard_uses_subdomain: true,
  LA_cas_uses_subdomain: true,
  hostnames: 'vm1',
  hostnamesList: ['vm1'],
  LA_collectory_suburl: 'collections',
  LA_collectory_iniPath: '',
  LA_collectory_hostname: 'vm1',
  LA_collectory_path: '/',
  LA_collectory_url: 'collections.ala.org.au',
  LA_ala_hub_suburl: 'biocache',
  LA_ala_hub_iniPath: '',
  LA_ala_hub_hostname: 'vm2',
  LA_ala_hub_path: '/',
  LA_ala_hub_url: 'biocache.ala.org.au',
  LA_biocache_service_suburl: 'biocache-ws',
  LA_biocache_service_iniPath: 'ws',
  LA_biocache_service_hostname: 'vm3',
  LA_biocache_service_path: '/ws',
  LA_biocache_service_url: 'biocache-ws.ala.org.au',
  LA_ala_bie_suburl: 'bie',
  LA_ala_bie_iniPath: '',
  LA_ala_bie_hostname: 'vm4',
  LA_ala_bie_path: '/',
  LA_ala_bie_url: 'bie.ala.org.au',
  LA_bie_index_suburl: 'bie-index',
  LA_bie_index_iniPath: '',
  LA_bie_index_hostname: 'vm5',
  LA_bie_index_path: '/',
  LA_bie_index_url: 'bie-index.ala.org.au',
  LA_images_suburl: 'images',
  LA_images_iniPath: '',
  LA_images_hostname: 'vm6',
  LA_images_path: '/',
  LA_images_url: 'images.ala.org.au',
  LA_species_lists_suburl: 'lists',
  LA_species_lists_iniPath: '',
  LA_species_lists_hostname: 'vm7',
  LA_species_lists_path: '/',
  LA_species_lists_url: 'lists.ala.org.au',
  LA_regions_suburl: 'regions',
  LA_regions_iniPath: '',
  LA_regions_hostname: 'vm8',
  LA_regions_path: '/',
  LA_regions_url: 'regions.ala.org.au',
  LA_logger_suburl: 'logger',
  LA_logger_iniPath: '',
  LA_logger_hostname: 'vm9',
  LA_logger_path: '/',
  LA_logger_url: 'logger.ala.org.au',
  LA_solr_suburl: 'index',
  LA_solr_iniPath: '',
  LA_solr_hostname: 'vm10',
  LA_solr_path: '/',
  LA_solr_url: 'index.ala.org.au',
  LA_biocache_backend_suburl: 'biocache-backend',
  LA_biocache_backend_iniPath: '',
  LA_biocache_backend_hostname: 'vm11',
  LA_biocache_backend_path: '/biocache-backend',
  LA_biocache_backend_url: 'ala.org.au',
  LA_cas_suburl: 'auth',
  LA_cas_iniPath: '',
  LA_cas_hostname: 'vm12',
  LA_cas_path: '/',
  LA_cas_url: 'auth.ala.org.au',
  LA_spatial_suburl: 'spatial',
  LA_spatial_iniPath: '',
  LA_spatial_hostname: 'vm13',
  LA_spatial_path: '/',
  LA_spatial_url: 'spatial.ala.org.au',
  LA_alerts_suburl: 'alerts',
  LA_alerts_iniPath: '',
  LA_alerts_hostname: 'vm14',
  LA_alerts_path: '/',
  LA_alerts_url: 'alerts.ala.org.au',
  LA_doi_suburl: 'doi',
  LA_doi_iniPath: '',
  LA_doi_hostname: 'vm15',
  LA_doi_path: '/',
  LA_doi_url: 'doi.ala.org.au',
  LA_dashboard_suburl: 'dashboard',
  LA_dashboard_iniPath: '',
  LA_dashboard_hostname: 'vm16',
  LA_dashboard_path: '/',
  LA_dashboard_url: 'dashboard.ala.org.au',
  LA_branding_hostname: 'vm17',
};

const P = 'generator-living-atlas';
const G = 'promptValues';

const src = { conf: defObj };
let dest = transform(src);

/*
   Now this is generated in the la-toolkit and checked via check-dir-name call
   test('pkgname transform', async (t) => {
   const src = { conf: { LA_project_shortname: 'GBIF.ES' } };
   let dest = transform(src);
   t.is(dest[P][G].LA_pkg_name, 'gbif-es');
   }); */

test.before((/* t */) => {
  // This runs before all tests
  sails.lift(
    {
      // Your Sails app's configuration files will be loaded automatically,
      // but you can also specify any other special overrides here for testing purposes.

      // For example, we might want to skip the Grunt hook,
      // and disable all logs except errors and warnings:
      hooks: { grunt: false },
      log: { level: 'warn' },
      datastores: {
        default: {
          adapter: 'sails-disk',
        },
      },
      port: 13370,
      sshDir: '/var/tmp/la-toolkit/.ssh/',
      asshDir: '/var/tmp/la-toolkit/.ssh/assh.d/',
      projectsDir: '/var/tmp/la-toolkit/config/',
      logsDir: '/var/tmp/la-toolkit/logs/',
      baseBrandingLocation: '/data/la-generator/base-branding',
      preCmd: 'docker exec -u ubuntu la-toolkit',
      ttydMinPort: 20011,
      ttydMaxPort: 20100,
    },
    function (err) {
      if (err) {
        // return;
      }

      // here you can load fixtures, etc.
      // (for example, you might want to create some records in the database)

      // return;
    }
  );
});

test('long name valid', async (t) => {
  const testObj = defObj;
  const names = [
    '回尚芸策出多探政検済浜朝毎。車記隠地実問底欠葉下女保月兄介禄情内線裁。的点回父政埼芸岡',
    'LA Wäkßandâ',
    'Biodiversitäts-Atlas Österreich',
    'Лорем ипсум долор сит амет, фастидии ехпетенда при ид.',
    '議さだや設9売サコヱ助送首し康美イヤエテ決竹ハキ約泣ヘハ式追だじけ',
  ];
  for (let name in names) {
    testObj.LA_project_name = names[name];
    testObj.LA_project_shortname = names[name]; // .substring(0, 10);
    t.is(validate({ conf: JSON.stringify(testObj) }), '');
    let src = { conf: testObj };
    let dest = transform(src);
    t.is(dest[P][G].LA_project_name.length > 0, true);
    t.is(dest[P][G].LA_project_shortname.length > 0, true);
    t.is(dest[P][G].LA_project_name, src.conf.LA_project_name);
    t.is(dest[P][G].LA_project_shortname, src.conf.LA_project_shortname);
  }
});

test('cas', (t) => {
  t.is(dest[P][G].LA_use_CAS, true);
  t.is(dest[P][G].LA_use_CAS, src.conf.LA_use_cas);
  t.is(dest[P][G].LA_cas_url, 'auth.ala.org.au');
});

test('spatial', (t) => {
  t.is(dest[P][G].LA_use_spatial, true);
  t.is(dest[P][G].LA_use_spatial, src.conf.LA_use_spatial);
  t.is(dest[P][G].LA_spatial_url, 'spatial.ala.org.au');
});

test('others', (t) => {
  t.is(dest[P][G].LA_doi_url, 'doi.ala.org.au');
  t.is(dest[P][G].LA_alerts_url, 'alerts.ala.org.au');
  t.is(dest[P][G].LA_dashboard_url, 'dashboard.ala.org.au');
});

test('use_ala_bie', (t) => {
  t.is(dest[P][G].LA_use_species, true);
  t.is(dest[P][G].LA_use_species, src.conf.LA_use_ala_bie);
});

test('species list use', (t) => {
  t.is(dest[P][G].LA_use_species_lists, true);
});

test('species list url', (t) => {
  t.is(dest[P][G].LA_lists_url, 'lists.ala.org.au');
});

test('species list path', (t) => {
  t.is(dest[P][G].LA_lists_path, '/');
});

test('hosts', (t) => {
  t.is(dest[P][G].LA_collectory_hostname, 'vm1');
  t.is(dest[P][G].LA_ala_hub_hostname, 'vm2');
  t.is(dest[P][G].LA_biocache_service_hostname, 'vm3');
  t.is(dest[P][G].LA_ala_bie_hostname, 'vm4');
  t.is(dest[P][G].LA_bie_index_hostname, 'vm5');
  t.is(dest[P][G].LA_images_hostname, 'vm6');
  t.is(dest[P][G].LA_lists_hostname, 'vm7');
  t.is(dest[P][G].LA_regions_hostname, 'vm8');
  t.is(dest[P][G].LA_logger_hostname, 'vm9');
  t.is(dest[P][G].LA_solr_hostname, 'vm10');
  t.is(dest[P][G].LA_biocache_backend_hostname, 'vm11');
  t.is(dest[P][G].LA_cas_hostname, 'vm12');
  t.is(dest[P][G].LA_spatial_hostname, 'vm13');
  t.is(dest[P][G].LA_alerts_hostname, 'vm14');
  t.is(dest[P][G].LA_doi_hostname, 'vm15');
  t.is(dest[P][G].LA_dashboard_hostname, 'vm16');
  t.is(dest[P][G].LA_branding_hostname, 'vm17');
});

test('json validation default', (t) => {
  t.is(validate({ conf: JSON.stringify(defObj) }), '');
});

test('invalid and valid hostnames', (t) => {
  t.is(hostnameRegexp.test('aad&'), false);
  t.is(hostnameRegexp.test('aad%%%'), false);
  t.is(hostnameRegexp.test('aad$z&'), false);
  t.is(hostnameRegexp.test('aadAAA1213'), true);
  t.is(hostnameRegexp.test('aad1213.org'), true);
  t.is(hostnameRegexp.test('aad1213_0-1'), true);
});

test('invalid and valid domains', (t) => {
  t.is(domainRegexp.test('http://gbif.ad'), false);
  t.is(domainRegexp.test('https://gbif.ad'), false);
  t.is(domainRegexp.test('gbif.ad'), true);
  t.is(domainRegexp.test('data.canadensys.net'), true);
  t.is(domainRegexp.test('gbif.ad/'), false);
});

test('spatial false also regions', async (t) => {
  const src = {
    conf: { LA_project_shortname: 'GBIF.ES', LA_use_spatial: false },
  };
  let dest = transform(src);
  t.is(dest[P][G].LA_use_regions, false);
});

test('bie false also species lists', async (t) => {
  const src = {
    conf: { LA_project_shortname: 'GBIF.ES', LA_use_ala_bie: false },
  };
  let dest = transform(src);
  t.is(dest[P][G].LA_use_species_lists, false);
});

test('port pool test', async (t) => {
  const { ttyd, ttyFreePort, pidKill } = require('../api/libs/ttyd-utils.js');
  let port = await ttyFreePort();
  let pid1 = await ttyd('bash', port, false, '/tmp');
  await delay(4000);
  let port1 = await ttyFreePort();
  console.log(`port free: ${port1}`);
  t.not(port, port1);
  let pid2 = await ttyd('bash', port1, true, '/tmp');
  await delay(4000);
  let port2 = await ttyFreePort();
  console.log(`port free: ${port}`);
  t.not(port1, port2);
  await pidKill(pid1);
  await pidKill(pid2);
});
