const path = require('path');
const express = require('express');
const browserSync = require('browser-sync');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware');

const paths = require('../config/paths');
const webpackConfig = require('./webpack.config');
const run = require('./utils/run');
const clean = require('./utils/clean');

const config = require('config').util.loadFileConfigs(paths.appPath + '/config');

const { format } = run;

// https://webpack.js.org/configuration/watch/#watchoptions
const watchOptions = {
  // Watching may not work with NFS and machines in VirtualBox
  // Uncomment next line if it is your case (use true or interval in milliseconds)
  // poll: true,
  // Decrease CPU or memory usage in some file systems
  ignored: /node_modules/,
};

function createCompilation(name, compiler, config) {
  return new Promise((resolve, reject) => {
    let timeStart = new Date();

    compiler.hooks.compile.tap(name, () => {
      timeStart = new Date();
      console.info(`[${format(timeStart)}] Compiling '${name}'...`);
    });

    compiler.hooks.done.tap(name, stats => {
      console.info(stats.toString(config.stats));
      const timeEnd = new Date();
      const time = timeEnd.getTime() - timeStart.getTime();

      if (stats.hasErrors()) {
        console.info(
          `[${format(timeEnd)}] Failed to compile '${name}' after ${time} ms`,
        );
        console.error(stats.toString());
        reject(new Error('Compilation failed!'));
      } else {
        console.info(
          `[${format(
            timeEnd,
          )}] Finished '${name}' compilation after ${time} ms`,
        );
        resolve(stats);
      }
    });
  });
};

/**
 * Launches a development web server with "live reload" functionality -
 * synchronizing URLs, interactions and code changes across multiple devices.
 */

let server;

async function start() {
  if (server) {
    return server;
  };

  server = express();
  server.use(errorOverlayMiddleware());
  server.use(express.static(paths.appPublic));

  // Configure client-side hot module replacement
  const clientConfig = webpackConfig.find(config => config.name === 'client');

  clientConfig.entry.client = [path.resolve(__dirname + '/lib/webpackHotDevClient'), ...clientConfig.entry.client ];

  clientConfig.output.filename = clientConfig.output.filename.replace(
    'chunkhash',
    'fullhash',
  );

  clientConfig.output.chunkFilename = clientConfig.output.chunkFilename.replace(
    'chunkhash',
    'fullhash',
  );

  clientConfig.module.rules = clientConfig.module.rules.filter(
    x => x.loader !== 'null-loader',
  );

  clientConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
  );

  clientConfig.optimization.moduleIds = 'named';

  // Configure server-side hot module replacement
  const serverConfig = webpackConfig.find(config => config.name === 'server');

  serverConfig.output.hotUpdateMainFilename = 'updates/[fullhash].hot-update.json';
  serverConfig.output.hotUpdateChunkFilename = 'updates/[id].[fullhash].hot-update.js';
  serverConfig.module.rules = serverConfig.module.rules.filter(x => x.loader !== 'null-loader',);
  serverConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin()
  );

  serverConfig.optimization.moduleIds = 'named';

  // Configure compilation
  await run(clean);

  const clientCompiler = webpack(clientConfig);
  const serverCompiler = webpack(serverConfig);

  const clientPromise = createCompilation(
    'client',
    clientCompiler,
    clientConfig,
  ).catch(console.error);

  const serverPromise = createCompilation(
    'server',
    serverCompiler,
    serverConfig,
  ).catch(console.error);

  // https://github.com/webpack/webpack-dev-middleware
  server.use(
    webpackDevMiddleware(clientCompiler, {
      publicPath: clientConfig.output.publicPath,
      serverSideRender: true
    }),
  );

  // https://github.com/glenjamin/webpack-hot-middleware
  server.use(webpackHotMiddleware(clientCompiler, { log: console.log.bind(console) }));

  let appPromise;
  let appPromiseResolve;
  let appPromiseIsResolved = true;
  console.log('Compile tap');

  serverCompiler.hooks.compile.tap('compile', (params) => {
    if (!appPromiseIsResolved) {
      return;
    }
    appPromiseIsResolved = false;
    // eslint-disable-next-line no-return-assign
    appPromise = new Promise(resolve => (appPromiseResolve = resolve));
  })

  // serverCompiler.plugin('compile', () => {
  //    if (!appPromiseIsResolved) {
  //       return;
  //     }
  //     appPromiseIsResolved = false;
  //     // eslint-disable-next-line no-return-assign
  //     appPromise = new Promise(resolve => (appPromiseResolve = resolve));
  // });

  let app;

  server.use((req, res) => {
    appPromise
      .then(() => app.handle(req, res))
      .catch(error => console.error(error))
  });

  function checkForUpdate(fromUpdate) {
    const hmrPrefix = '[\x1b[35mHMR\x1b[0m] ';

    if (!app.hot) {
      throw new Error(`${hmrPrefix}Hot Module Replacement is disabled.`);
    }
    if (app.hot.status() !== 'idle') {
      return Promise.resolve();
    }

    return app.hot
      .check(true)
      .then(updatedModules => {
        if (!updatedModules) {
          if (fromUpdate) {
            console.info(`${hmrPrefix}Update applied.`);
          }

          return;
        }
        if (updatedModules.length === 0) {
          console.info(`${hmrPrefix}Nothing hot updated.`);
        } else {
          console.info(`${hmrPrefix}Updated modules:`);
          updatedModules.forEach(moduleId =>
            console.info(`${hmrPrefix} - ${moduleId}`),
          );
          checkForUpdate(true);
        }
      })
      .catch(error => {
        if (['abort', 'fail'].includes(app.hot.status())) {
          console.warn(`${hmrPrefix}Cannot apply update.`);
          delete require.cache[require.resolve(paths.appBuild + '/server.js')];
          // eslint-disable-next-line global-require, import/no-unresolved
          app = require(paths.appBuild + '/server.js').default;
          console.warn(`${hmrPrefix}App has been reloaded.`);
        } else {
          console.warn(
            `${hmrPrefix}Update failed: ${error.stack || error.message}`,
          );
        }
      });
  };

  serverCompiler.watch(watchOptions, (error, stats) => {
    if (app && !error && !stats.hasErrors()) {
      checkForUpdate().then(() => {
        appPromiseIsResolved = true;
        appPromiseResolve();
      });
    };
  });

  // Wait until both client-side and server-side bundles are ready
  await Promise.all([
    clientPromise,
    serverPromise
  ]);

  const timeStart = new Date();

  console.info(`[${format(timeStart)}] Launching server...`);

  // Load compiled src/server.ts as a middleware
  // eslint-disable-next-line global-require, import/no-unresolved
  app = require(paths.appBuild + '/server.js').default;
  appPromiseIsResolved = true;
  appPromiseResolve();

  // Launch the development server with Browsersync and HMR
  await new Promise((resolve, reject) =>
    browserSync.create().init(
      {
        // https://www.browsersync.io/docs/options
        server: 'src/server.ts',
        middleware: [server],
        reloadOnRestart: true,
        port: config.port,
        open: false,
        ...(process.argv.includes('--ui') ? {} : { notify: false, ui: false }),
        ghostMode: process.argv.includes('--ghost')
      },
      (error, bs) => (error ? reject(error) : resolve(bs)),
    ),
  );

  const timeEnd = new Date();
  const time = timeEnd.getTime() - timeStart.getTime();

  console.info(`[${format(timeEnd)}] Server launched after ${time} ms`);

  return server;
}

module.exports = start;