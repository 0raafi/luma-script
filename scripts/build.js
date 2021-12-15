const webpack = require('webpack');
const cp = require('child_process');

const run = require('./utils/run');
const clean = require('./utils/clean');
const copy = require('./utils/copy');
const pkg = require('../package.json');
const webpackConfig = require('./webpack.config');

/**
 * Compiles the project from source files into a distributable
 * format and copies it to the output (build) folder.
 */

function bundle() {
  return new Promise((resolve, reject) => {
    webpack(webpackConfig).run((err, stats) => {
      if (err) {
        return reject(err);
      }

      console.info(stats.toString(webpackConfig[0].stats));

      return resolve();
    });
  });
}

async function build() {
  await run(clean);
  await run(copy);
  await run(bundle);

  if (process.argv.includes('--docker')) {
    cp.spawnSync('docker', ['build', '-t', pkg.name, '.'], { stdio: 'inherit' })
  }
}

module.exports = build;
