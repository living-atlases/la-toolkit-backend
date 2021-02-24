const validator = require("validator");
const {projectNameRegexp, domainRegexp, hostnameRegexp, shortNameRegexp} = require("./regexp.js");

const services = [
  // default services
  "collectory",
  "ala_hub",
  "biocache_service",
  "ala_bie",
  "bie_index",
  "images",
  "logger",
  "solr",
  "biocache_backend",
  // optional
  "species_lists",
  "regions",
  "cas",
  "spatial",
  "alerts",
  "doi",
  "dashboard",
];

const enabledServices = [
  "collectory",
  "ala_hub",
  "biocache_service",
  "ala_bie",
  "bie_index",
  "images",
  "logger",
  "solr",
  "biocache_backend",
];

module.exports = function (inputs) {
  // JSON
  if (
    !validator.isJSON(inputs.conf, {
      allow_primitives: false,
    })
  ) {
    return "jsonError";
  }

  let param = JSON.parse(inputs.conf);

  if (!projectNameRegexp.test(param["LA_project_name"])) {
    return "projectNameError";
  }
  if (!shortNameRegexp.test(param["LA_project_shortname"])) {
    return "shortNameError";
  }
  if (!validator.isBoolean(param["LA_enable_ssl"] + "")) {
    return "paramError";
  }
  if (!domainRegexp.test(param["LA_domain"])) {
    return "domainError";
  }

  // First check the service booleans
  services.forEach((service) => {
    const value = param[`LA_use_${service}`] + "";

    if (value !== "undefined") {
      if (validator.isBoolean(value)) {
        if (value) {
          enabledServices.push(service);
        }
      } else {
        return "paramError";
      }
    }
  });

  enabledServices.forEach((service) => {
    const url = param[`LA_${service}_url`];
    const path = param[`LA_${service}_path`];
    const host = param[`LA_${service}_hostname`];
    if (typeof url !== 'string' || typeof path !== 'string' || typeof host !== 'string')
      return "serviceParamError";
    if (
      !validator.isURL(url, {require_protocol: false, require_host: true})
    ) {
      return "serviceUrlParamError";
    }
    if (
      !validator.isURL(path, {require_protocol: false, require_host: false})
    ) {
      return "servicePathParamError";
    }
    if (!hostnameRegexp.test(host)) {
      return "serviceHostParamError";
    }
  });

  return "";
};
