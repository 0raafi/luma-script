#!/usr/bin/env node
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
const path = require('path');

process.on('unhandledRejection', err => {
  throw err;
});

require('../config/env');

const spawn = require('react-dev-utils/crossSpawn');
const args = process.argv.slice(2);
const isInspect = process.argv.includes('--inspect');

const scriptIndex = args.findIndex(x => x === 'build' || x === 'start' || x === 'test' || x === 'serve');
const script = scriptIndex === -1 ? args[0] : args[scriptIndex];
const nodeArgs = scriptIndex > 0 ? args.slice(0, scriptIndex) : [];

const format = (time) => time.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, '$1');

const run = (fn, options) => {
  const task = typeof fn.default === 'undefined' ? fn : fn.default;
  const start = new Date();

  console.info(`[${format(start)}] Starting '${task.name}${options ? ` (${options})` : ''}'...`);

  return task(options).then(resolution => {
    const end = new Date();
    const time = end.getTime() - start.getTime();

    console.info(`[${format(end)}] Finished '${task.name}${options ? ` (${options})` : ''}' after ${time} ms`);

    return resolution;
  })
};

switch (script) {
  case 'test': {
    const result = spawn.sync(
      'node',
      nodeArgs
        .concat(require.resolve(path.resolve(__dirname, '..', 'scripts', `${script}.js`)))
        .concat(args.slice(scriptIndex + 1)),
      { stdio: 'inherit' }
    );

    if (result.signal) {
      if (result.signal === 'SIGKILL') {
        console.log(
          'The build failed because the process exited too early. ' +
          'This probably means the system ran out of memory or someone called ' +
          '`kill -9` on the process.'
        );
      } else if (result.signal === 'SIGTERM') {
        console.log(
          'The build failed because the process exited too early. ' +
          'Someone might have called `kill` or `killall`, or the system could ' +
          'be shutting down.'
        );
      }

      process.exit(1);
    }

    process.exit(result.status);
  }

  case 'build': {
    if (require.main === module && process.argv.length > 2) {
      process.env.DEV_SERVER = false;

      // eslint-disable-next-line no-underscore-dangle
      delete require.cache[__filename];

      // eslint-disable-next-line global-require, import/no-dynamic-require
      const module = require(path.resolve(__dirname, '..', 'scripts', `${script}.js`));

      run(module).catch((err) => {
        console.error(err.stack);
        process.exit(1);
      })
    }

    break;
  }

  case 'start': {
    if (require.main === module && process.argv.length > 2) {
      process.env.DEV_SERVER = true;

      // eslint-disable-next-line no-underscore-dangle
      delete require.cache[__filename];

      // eslint-disable-next-line global-require, import/no-dynamic-require
      const module = require(path.resolve(__dirname, '../scripts', `${script}.js`));

      run(module).catch((err) => {
        console.error(err.stack);
        process.exit(1);
      })
    }

    break;
  }

  case 'serve': {
    process.env.DEV_SERVER = false;

    const result = spawn.sync(
      'node',
      nodeArgs
        .concat(isInspect ? ['--inspect'] : [])
        .concat('-r')
        .concat('dotenv/config')
        .concat(require.resolve(`${__dirname}/cluster`))
        .concat(require.resolve(`${__dirname}/server.js`))
        .concat(args.slice(scriptIndex + 1)),
      { stdio: 'inherit' }
    );

    if (result.signal) {
      if (result.signal === 'SIGKILL') {
        console.log(
          'The build failed because the process exited too early. ' +
          'This probably means the system ran out of memory or someone called ' +
          '`kill -9` on the process.'
        );
      } else if (result.signal === 'SIGTERM') {
        console.log(
          'The build failed because the process exited too early. ' +
          'Someone might have called `kill` or `killall`, or the system could ' +
          'be shutting down.'
        );
      }

      process.exit(1);
    }

    process.exit(result.status);
  }

  default:
    console.log('Unknown script "' + script + '".');
    break;
}