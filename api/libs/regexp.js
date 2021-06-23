// noinspection HttpUrlsUsage

module.exports.projectNameRegexp = /\p{General_Category=Letter}/u;
module.exports.domainRegexp = /^(?!(https:\/\/|http:\/\/|www\.|mailto:|smtp:|ftp:\/\/|ftps:\/\/))(((([a-zA-Z0-9])|([a-zA-Z0-9][a-zA-Z0-9\-]{0,86}[a-zA-Z0-9]))\.(([a-zA-Z0-9])|([a-zA-Z0-9][a-zA-Z0-9\-]{0,73}[a-zA-Z0-9]))\.(([a-zA-Z0-9]{2,12}\.[a-zA-Z0-9]{2,12})|([a-zA-Z0-9]{2,25})))|((([a-zA-Z0-9])|([a-zA-Z0-9][a-zA-Z0-9\-]{0,162}[a-zA-Z0-9]))\.(([a-zA-Z0-9]{2,12}\.[a-zA-Z0-9]{2,12})|([a-zA-Z0-9]{2,25}))))$/;
module.exports.hostnameRegexp = /^[._\-a-z0-9A-Z, ]+$/;
//module.exports.shortNameRegexp = /^[._\-a-z0-9A-Z ]+$/;
module.exports.shortNameRegexp = /\p{General_Category=Letter}/u;
module.exports.objectId = /^[0-9a-fA-F]{24}$/;
