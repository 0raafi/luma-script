const paths = require('../../config/paths');
const config = require('config').util.loadFileConfigs(paths.appPath + '/config');
const { cleanDir } = require('../lib/fs');

/**
 * Cleans up the output (build) directory.
 */
function clean() {
  return Promise.all([
    cleanDir('build/*', {
      nosort: true,
      dot: true,
      ignore: ['build/.gitkeep'],
    }),
    cleanDir(`${config.logDir}/${config.logFileName}`)
  ]);
}

module.exports = clean;
