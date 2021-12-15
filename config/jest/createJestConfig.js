'use strict';

const path = require('path');

module.exports = (resolve, rootDir, srcRoots) => {
  const toRelRootDir = f => '<rootDir>/' + path.relative(rootDir || '', f);

  const config = {
    collectCoverageFrom: ['src/**/*.{ts,js,tsx,jsx,mjs}'],
    setupFiles: [resolve('config/jest/runtime-polyfills.js'), resolve('scripts/utils/polyfills.js')],
    testMatch: [
      '**/__tests__/**/*.{ts,js,tsx,jsx,mjs}',
      '**/?(*.)(spec|test).{ts,js,tsx,jsx,mjs}',
    ],
    coverageThreshold: {
      global: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90
      }
    },
    coverageReporters: [
      "lcov",
      "html"
    ],
    roots: srcRoots.map(toRelRootDir),
    testEnvironment: 'node',
    testURL: 'http://localhost',
    transform: {
      '^.+\\.(js|ts|jsx|tsx|mjs)$': resolve('config/jest/babelTransform.js'),
      '^.+\\.css$': resolve('config/jest/cssTransform.js'),
      '^.+\\.(graphql)$': resolve('config/jest/graphqlTransform.js'),
      '^(?!.*\\.(js|jsx|mjs|css|json|graphql)$)': resolve('config/jest/fileTransform.js'),
    },
    transformIgnorePatterns: [
      '^.+\\.module\\.css$',
    ],
    moduleFileExtensions: [
      'web.js',
      'mjs',
      'ts',
      'js',
      'json',
      'web.jsx',
      'jsx',
      'tsx',
      'node',
    ],
    testPathIgnorePatterns: [
      "/node_modules/",
      "<rootDir>/tests/",
      "<rootDir>/src/*.ts",
      "<rootDir>/src/*.tsx",
      "<rootDir>/graphql/"
    ],
    coveragePathIgnorePatterns: [
      "/node_modules/",
      "<rootDir>/src/*.js",
      "<rootDir>/src/*.tsx",
      "<rootDir>/src/core/",
      "<rootDir>/src/hooks/",
      "<rootDir>/src/helpers/",
      "<rootDir>/src/lang/*",
      "<rootDir>/src/routes/index.ts",
      "<rootDir>/public/",
      "<rootDir>/build/",
      "/*.spec.tsx",
      "/*.spec.ts",
      "<rootDir>/config/",
      "src/middlewares",
    ],
    setupFilesAfterEnv: [resolve('config/jest/jest-setup.js'), '<rootDir>/jest-setup.js'],
    verbose: true,
  };

  if (rootDir) {
    config.rootDir = rootDir;
  }

  
  return config;
};
