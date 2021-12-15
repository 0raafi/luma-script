'use strict';

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';

process.on('unhandledRejection', err => {
  throw err;
});

const jest = require('jest');
const path = require('path');

const createJestConfig = require('../config/jest/createJestConfig');
const paths = require('../config/paths');

require('../config/env');

let argv = process.argv.slice(2);

if (argv.indexOf('--coverage') === -1 && argv.indexOf('--watchAll') === -1) {
  argv.push('--watchAll');
}

argv.push(
  '--config',
  JSON.stringify(
    createJestConfig(
      relativePath => path.resolve(__dirname, '..', relativePath),
      paths.appPath,
      paths.srcPaths
    )
  )
);

const testEnvironment = 'jsdom';
argv.push('--coverage', '--env', testEnvironment);

jest.run(argv);
