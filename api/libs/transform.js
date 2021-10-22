// https://github.com/wankdanker/node-object-mapper
const objectMapper = require('object-mapper');

module.exports = function (inputs) {
  const map = {
    LA_id: 'LA_id',
    LA_project_name: 'LA_project_name',
    LA_project_shortname: 'LA_project_shortname',
    LA_pkg_name: 'LA_pkg_name',
    LA_domain: 'LA_domain',
    LA_use_ala_bie: 'LA_use_species',
    LA_use_spatial: 'LA_use_spatial',
    LA_use_regions: 'LA_use_regions',
    LA_use_species: 'LA_use_species',
    LA_use_species_lists: 'LA_use_species_lists',
    LA_use_cas: 'LA_use_CAS',
    LA_use_images: 'LA_use_images',
    LA_use_alerts: 'LA_use_alerts',
    LA_use_doi: 'LA_use_doi',
    LA_use_webapi: 'LA_use_webapi',
    LA_use_dashboard: 'LA_use_dashboard',
    LA_use_biocache_backend: 'LA_use_biocache_store',
    LA_use_pipelines: 'LA_use_pipelines',
    LA_use_sds: 'LA_use_sds',
    LA_enable_ssl: 'LA_enable_ssl',
    LA_use_git: {key: 'LA_use_git', default: true},
    LA_generate_branding: {key: 'LA_generate_branding', default: true},
    LA_cas_hostname: 'LA_cas_hostname',
    LA_cas_url: 'LA_cas_url',
    LA_spatial_hostname: 'LA_spatial_hostname',
    LA_spatial_url: 'LA_spatial_url',
    LA_branding_uses_subdomain: 'LA_branding_uses_subdomain',
    LA_branding_hostname: 'LA_branding_hostname',
    LA_branding_url: 'LA_branding_url',
    LA_branding_path: 'LA_branding_path',
    LA_collectory_uses_subdomain: 'LA_collectory_uses_subdomain',
    LA_collectory_hostname: 'LA_collectory_hostname',
    LA_collectory_url: 'LA_collectory_url',
    LA_collectory_path: 'LA_collectory_path',
    LA_ala_hub_uses_subdomain: 'LA_ala_hub_uses_subdomain',
    LA_ala_hub_hostname: 'LA_ala_hub_hostname',
    LA_ala_hub_url: 'LA_ala_hub_url',
    LA_ala_hub_path: 'LA_ala_hub_path',
    LA_biocache_service_uses_subdomain: 'LA_biocache_service_uses_subdomain',
    LA_biocache_service_hostname: 'LA_biocache_service_hostname',
    LA_biocache_service_url: 'LA_biocache_service_url',
    LA_biocache_service_path: 'LA_biocache_service_path',
    LA_ala_bie_uses_subdomain: 'LA_ala_bie_uses_subdomain',
    LA_ala_bie_hostname: 'LA_ala_bie_hostname',
    LA_ala_bie_url: 'LA_ala_bie_url',
    LA_ala_bie_path: 'LA_ala_bie_path',
    LA_bie_index_uses_subdomain: 'LA_bie_index_uses_subdomain',
    LA_bie_index_hostname: 'LA_bie_index_hostname',
    LA_bie_index_url: 'LA_bie_index_url',
    LA_bie_index_path: 'LA_bie_index_path',
    LA_images_uses_subdomain: 'LA_images_uses_subdomain',
    LA_images_hostname: 'LA_images_hostname',
    LA_images_url: 'LA_images_url',
    LA_images_path: 'LA_images_path',
    LA_species_lists_uses_subdomain: 'LA_lists_uses_subdomain',
    LA_species_lists_hostname: 'LA_lists_hostname',
    LA_species_lists_url: 'LA_lists_url',
    LA_species_lists_path: 'LA_lists_path',
    LA_regions_uses_subdomain: 'LA_regions_uses_subdomain',
    LA_regions_hostname: 'LA_regions_hostname',
    LA_regions_url: 'LA_regions_url',
    LA_regions_path: 'LA_regions_path',
    LA_logger_uses_subdomain: 'LA_logger_uses_subdomain',
    LA_logger_hostname: 'LA_logger_hostname',
    LA_logger_url: 'LA_logger_url',
    LA_logger_path: 'LA_logger_path',
    LA_solr_uses_subdomain: 'LA_solr_uses_subdomain',
    LA_solr_hostname: 'LA_solr_hostname',
    LA_solr_url: 'LA_solr_url',
    LA_solr_path: 'LA_solr_path',
    LA_biocache_backend_hostname: 'LA_biocache_backend_hostname',
    LA_webapi_uses_subdomain: 'LA_webapi_uses_subdomain',
    LA_webapi_hostname: 'LA_webapi_hostname',
    LA_webapi_url: 'LA_webapi_url',
    LA_webapi_path: 'LA_webapi_path',
    LA_dashboard_uses_subdomain: 'LA_dashboard_uses_subdomain',
    LA_dashboard_hostname: 'LA_dashboard_hostname',
    LA_dashboard_path: 'LA_dashboard_path',
    LA_dashboard_url: 'LA_dashboard_url',
    LA_sds_uses_subdomain: 'LA_sds_uses_subdomain',
    LA_sds_hostname: 'LA_sds_hostname',
    LA_sds_path: 'LA_sds_path',
    LA_sds_url: 'LA_sds_url',
    LA_alerts_uses_subdomain: 'LA_alerts_uses_subdomain',
    LA_alerts_hostname: 'LA_alerts_hostname',
    LA_alerts_path: 'LA_alerts_path',
    LA_alerts_url: 'LA_alerts_url',
    LA_doi_uses_subdomain: 'LA_doi_uses_subdomain',
    LA_doi_hostname: 'LA_doi_hostname',
    LA_doi_path: 'LA_doi_path',
    LA_doi_url: 'LA_doi_url',
    LA_server_ips: 'LA_server_ips',
    LA_theme: 'LA_theme',
    LA_collectory_map_centreMapLat: 'LA_collectory_map_centreMapLat',
    LA_collectory_map_centreMapLng: 'LA_collectory_map_centreMapLng',
    LA_spatial_map_lan: 'LA_spatial_map_lan',
    LA_spatial_map_lng: 'LA_spatial_map_lng',
    LA_regions_map_bounds: 'LA_regions_map_bounds',
    LA_spatial_map_bbox: 'LA_spatial_map_bbox',
    LA_spatial_map_areaSqKm: 'LA_spatial_map_areaSqKm',
    LA_additionalVariables: 'LA_additionalVariables',
    LA_etc_hosts: 'LA_etc_hosts',
    LA_hostnames: 'LA_hostnames',
    LA_ssh_keys: 'LA_ssh_keys',
    // VariablesDesc (sorted)
    LA_variable_ansible_user: 'LA_variable_ansible_user',
    LA_variable_caches_auth_enabled: 'LA_variable_caches_auth_enabled',
    LA_variable_caches_collections_enabled:
      'LA_variable_caches_collections_enabled',
    LA_variable_caches_layers_enabled: 'LA_variable_caches_layers_enabled',
    LA_variable_caches_logs_enabled: 'LA_variable_caches_logs_enabled',
    LA_variable_cas_webflow_encryption_key:
      'LA_variable_cas_webflow_encryption_key',
    LA_variable_cas_webflow_signing_key: 'LA_variable_cas_webflow_signing_key',
    LA_variable_downloads_terms_of_use: 'LA_variable_downloads_terms_of_use',
    LA_variable_email_sender: 'LA_variable_email_sender',
    LA_variable_email_sender_password: 'LA_variable_email_sender_password',
    LA_variable_email_sender_server: 'LA_variable_email_sender_server',
    LA_variable_email_sender_server_port:
      'LA_variable_email_sender_server_port',
    LA_variable_email_sender_server_tls: 'LA_variable_email_sender_server_tls',
    LA_variable_favicon_url: 'LA_variable_favicon_url',
    LA_variable_google_api_key: 'LA_variable_google_api_key',
    LA_variable_header_and_footer_baseurl:
      'LA_variable_header_and_footer_baseurl',
    LA_variable_map_zone_name: 'LA_variable_map_zone_name',
    LA_variable_maxmind_account_id: 'LA_variable_maxmind_account_id',
    LA_variable_maxmind_license_key: 'LA_variable_maxmind_license_key',
    LA_variable_orgAddress: 'LA_variable_orgAddress',
    LA_variable_orgCity: 'LA_variable_orgCity',
    LA_variable_orgCountry: 'LA_variable_orgCountry',
    LA_variable_orgEmail: 'LA_variable_orgEmail',
    LA_variable_orgPostcode: 'LA_variable_orgPostcode',
    LA_variable_orgStateProvince: 'LA_variable_orgStateProvince',
    LA_variable_pac4j_cookie_encryption_key:
      'LA_variable_pac4j_cookie_encryption_key',
    LA_variable_pac4j_cookie_signing_key:
      'LA_variable_pac4j_cookie_signing_key',
    LA_variable_privacy_policy_url: 'LA_variable_privacy_policy_url',
    LA_variable_support_email: 'LA_variable_support_email',
    LA_variable_biocache_query_context: 'LA_variable_biocache_query_context',
    LA_variable_sds_faq_url: 'LA_variable_sds_faq_url',
    LA_is_hub: 'LA_is_hub',
    LA_software_versions: 'LA_software_versions',
    LA_pipelines_hostname: 'LA_pipelines_hostname',
    LA_variable_pipelines_master: 'LA_variable_pipelines_master',
    LA_variable_pipelines_ssh_key: 'LA_variable_pipelines_ssh_key'
  };

  let objMapped = objectMapper(inputs.conf, map);

  if (inputs.conf.LA_hubs != null) {
    objMapped.LA_hubs = [];
    for (let hub of inputs.conf.LA_hubs) {
      objMapped.LA_hubs.push(objectMapper(hub, map));
    }
  }

  if (!objMapped.LA_use_spatial) objMapped.LA_use_regions = false;

  if (!objMapped.LA_use_species) objMapped.LA_use_species_lists = false;

  let debug = false;

  if (debug) {
    for (let [key, value] of Object.entries(objMapped)) {
      if (
        key !== 'LA_pkg_name' &&
        (typeof value === 'string' || typeof value === 'number')
      ) {
        objMapped[key] = `_GEN_${value}_GEN_`;
      }
    }
  }

  return {
    'generator-living-atlas': {
      promptValues: objMapped,
      firstRun: false,
    },
  };

};
