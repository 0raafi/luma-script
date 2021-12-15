const paths = require('../config/paths');

require('source-map-support/register');
require(paths.appBuild + '/server.js');
