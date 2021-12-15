const fs = require('fs');
const path = require('path');
const glob = require('glob-all')
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const AssetsPlugin = require('assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const PurgeCSSPlugin = require('purgecss-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const LoadablePlugin = require('@loadable/webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer'); // help tailwindcss to work

const paths = require('../config/paths');
const progressHandler = require('./utils/progress');

const config = require('config').util.loadFileConfigs(`${paths.appPath}/config`);

const pkg = require(`${paths.appPath}/package.json`);

const buildId = Date.now();
const { name, version } = pkg;

const {
  argv,
  env: {
    NODE_ENV,
    SOURCE_MAP,
    DEV_SERVER,
    ALLOW_CONSOLE,
    GENERATE_SW,
    SW_IMPORTS,
    WEBPACK_PARALLEL
  }
} = process;

const isDevEnv = NODE_ENV !== 'production';
const isProdEnv = NODE_ENV === 'production';
const useSourceMap = SOURCE_MAP !== 'false';
const isProfiling = argv.includes('--profile');
const isVerbose = argv.includes('--verbose');
const isAnalyze = argv.includes('--analyze') || argv.includes('--analyse');
const isRuntimeDev = DEV_SERVER === 'true';
const mode = !isProdEnv ? 'development' : 'production';

console.log(
  `Building webpack project ${name}@${version}\n`,
  Object.entries({
    mode,
    isDevEnv,
    isRuntimeDev,
    useSourceMap,
    isProfiling,
    isVerbose,
    isAnalyze,
    config_compiler: config.compiler_public_path,
    tsConfig: path.resolve(paths.appPath, 'tsconfig.json')
  }).reduce((a, [k, v]) => a += `${k}: ${v}\n`, '\n')
);

const terserCache = {};

const recursiveIssuer = (m) => {
  if (m.issuer) {
    return recursiveIssuer(m.issuer);
  } else if (m.name) {
    return m.name;
  } else {
    return false;
  }
};
//
// //Generate SW Environment Config
// class GenerateSWEnvPlugin {
//   // Define `apply` as its prototype method which is supplied with compiler as its argument
//   apply(compiler) {
//     // Specify the event hook to attach to
//     compiler.hooks.beforeRun.tapAsync(
//       'GenerateSWEnvPlugin',
//       (__, callback) => {
//         fs.writeFileSync(`${paths.appPath  }/public/env.js`,
//           `
//           var env = {
//             FIREBASE_SENDER_ID: ${FIREBASE_SENDER_ID}
//           }
//           `
//         );
//         fs.writeFileSync(`${paths.appBuild  }/public/env.js`,
//           `
//           var env = {
//             FIREBASE_SENDER_ID: ${FIREBASE_SENDER_ID}
//           }
//           `
//         );
//         callback();
//       }
//     );
//   };
// };

//
// Common configuration chunk to be used for both
// client-side (client.tsx) and server-side (server.ts) bundles
// -----------------------------------------------------------------------------
const webpackConfig = ({ isClient }) => ({
  mode,
  cache: {
    type: 'filesystem',
    name: `${isClient ? 'client' : 'server'}${isProdEnv ? '-prod' : '-dev'}${isRuntimeDev ? '-runtime' : ''}-cache`
  },

  output: {
    path: `${paths.appBuild}/public/assets/`,
    publicPath: config.compiler_public_path || '/assets/',
    pathinfo: isVerbose
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
    plugins: [
      new TsconfigPathsPlugin({
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
        configFile: path.resolve(paths.appPath, 'tsconfig.json')
      })
    ],
    alias: {
      build: paths.appBuild
    }
  },

  parallelism: isAnalyze ? 1 : (WEBPACK_PARALLEL ? parseInt(WEBPACK_PARALLEL, 10) : 100),

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        include: paths.appSrc,
        use: [
          {
            loader: 'babel-loader',
            options: {
              babelrc: true,
              compact: isProdEnv,
              cacheDirectory: true,
              cacheCompression: false,
              babelrcRoots: [paths.appPath],
            },
          },
        ],
      },
      {
        test: /\.(graphql|gql)$/,
        use: ['graphql-tag/loader'],
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto",
      },
      {
        test: /\.(gif|svg|png|jpe?g|pdf)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              limit: 1024,
              name: isRuntimeDev ? '[name].[ext]' : '[hash].[ext]',
              emitFile: isClient,
            },
          },
        ],
      },
      // Exclude dev modules from production build
    ].filter(Boolean),
  },

  plugins: [
    new webpack.ProgressPlugin(progressHandler),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        context: paths.appPath,
        configFile: path.resolve(paths.appPath, 'tsconfig.json'),
      }
    }),
    new StyleLintPlugin({
      configBasedir: paths.appPath,
      configFile: `${paths.appPath}/.stylelintrc`,
      lintDirtyModulesOnly: isRuntimeDev,
      extensions: ['css', 'scss'],
      customSyntax: 'postcss-scss'
    })
  ],

  // Don't attempt to continue if there are any errors.
  bail: isProdEnv,
  stats: 'minimal'
});

const styleLoaders = ({ isClient }) => [
  {
    loader: 'css-loader',
    options: {
      modules: false,
      importLoaders: 2,
      sourceMap: true,
    },
  },
  'resolve-url-loader'
];

//
// Configuration for the client-side bundle (client.tsx)
// -----------------------------------------------------------------------------
const baseClientConfig = webpackConfig({ isClient: true });
const clientConfig = {
  ...baseClientConfig,
  name: 'client',
  target: 'web',
  performance: {
    hints: isProdEnv ? 'warning' : false,
    assetFilter: assetFilename => !/\.map|server.(js|ts)$/.test(assetFilename),
  },
  optimization: {
    minimize: isProdEnv,
    nodeEnv: false,
    sideEffects: 'flag',
    splitChunks: {
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          enforce: true
        },
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true
        },
      }
    },
    minimizer: isProdEnv ? [
      new TerserPlugin({
        minify: TerserPlugin.esbuildMinify,
        parallel: true
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['advanced', {
            discardComments: {
              removeAll: true
            },
            autoprefixer: {
              add: true,
            },
          }],
        },
      })
    ] : [],
  },
  entry: {
    client: [`${paths.appSrc}/client.tsx`]
  },
  output: {
    ...baseClientConfig.output,
    filename: isRuntimeDev ? '[name].js' : `[name].[chunkhash:8].${buildId}.js`,
    chunkFilename: isRuntimeDev ? '[name].chunk.js' : `[name].chunk.[chunkhash:8].${buildId}.js`,
    crossOriginLoading: 'anonymous',
    library: {
      type: 'umd'
    }
  },
  module: {
    rules: [
      ...baseClientConfig.module.rules,
      {
        test: /\.(css|scss)$/,
        sideEffects: true,
        use: [
          isRuntimeDev ? 'style-loader' : {
            loader: MiniCssExtractPlugin.loader,
            options: {
              esModule: false
            }
          },
          ...(styleLoaders({ isClient: true })),
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
              sassOptions: {
                includePaths: [
                  // this one for using node_modules as a base folder
                  // this one for using sass as the base folder
                ]
              },
              postcssOptions: {
                ident: 'postcss',
                plugins: [tailwindcss, autoprefixer]
              }
            },
          },
        ],
        include: [
          paths.appSrc,
          paths.appNodeModules,
        ]
      }
    ]
  },
  plugins: [
    ...baseClientConfig.plugins,
    new LoadablePlugin({
      filename: 'loadable-stats.json',
      writeToDisk: {
        filename: paths.appBuild
      },
      outputAsset: false
    }),
    // Define free variables
    // https://webpack.github.io/docs/list-of-plugins.html#defineplugin
    new webpack.DefinePlugin({
      CONFIG: JSON.stringify(config.globals),
      'process.env.DEV_SERVER': isRuntimeDev,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.BROWSER': true,
      __DEVTOOLS__: isVerbose  // <-------- DISABLE redux-devtools HERE
    }),
    isProfiling && new webpack.debug.ProfilingPlugin({
      outputPath: path.join(paths.appBuild, 'profileEvents.json')
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // all options are optional
      filename: isRuntimeDev ? '[name].css' : '[name].[fullhash].css',
      chunkFilename: isRuntimeDev ? "[id].css" : "[id].[contenthash].css",
      ignoreOrder: false, // Enable to remove warnings about conflicting order
    }),
    // TODO: Refactor this to work properly
    isProdEnv && new PurgeCSSPlugin({
      paths: glob.sync([
        `${paths.appSrc}/**/**/**/*`,
        `${paths.appSrc}/**/**/*`,
        `${paths.appSrc}/**/*`,
      ], { nodir: true }),
    }),
    // Emit a file with assets paths
    // https://github.com/sporto/assets-webpack-plugin#options
    new AssetsPlugin({
      path: paths.appBuild,
      filename: 'assets.json'
    }),
    // load `moment/locale/ja.js` and `moment/locale/it.js`
    // eslint-disable-next-line no-useless-escape
    //new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /id|en-gb/),
    // Webpack Bundle Analyzer
    // https://github.com/th0r/webpack-bundle-analyzer
    isAnalyze && new BundleAnalyzerPlugin(),
    // Service Worker & PWA
    //GENERATE_SW && new GenerateSWEnvPlugin,
    GENERATE_SW && new WorkboxPlugin.GenerateSW({
      cacheId: `${pkg.name}@${pkg.version}`,
      swDest: '../serviceworker.js',
      clientsClaim: true,
      skipWaiting: true,
      offlineGoogleAnalytics: true,
      importWorkboxFrom: 'local',
      globDirectory: `${paths.appPath}/public/`,
      globPatterns: ['*.{js,ico,png,html,css}'],
      ignoreUrlParametersMatching: [/./],
      navigateFallback: '/',
      exclude: [/\.jpe?g$/, /\.png$/, /\.gif$/, /\.svg$/, /\.webp$/, /\.map$/, /\.ttf$/, /\.woff2?$/, /\.eot$/],
      ...(SW_IMPORTS ? { importScripts: [...(SW_IMPORTS.split(','))] } : {}),
      runtimeCaching: [
        {
          urlPattern: /\/.*/,
          handler: 'networkFirst',
          options: {
            cacheName: `${pkg.name}-offline`,
            cacheableResponse: {
              statuses: [0, 200],
            }
          }
        }
      ],
    }),
  ].filter(Boolean),

  // Choose a developer tool to enhance debugging
  // http://webpack.github.io/docs/configuration.html#devtool
  devtool: isDevEnv && useSourceMap ? 'eval-cheap-source-map' : false,
  // Some libraries const Node modules but don't use them in the browser.
  // Tell Webpack to provide empty mocks for them so importing them works.
  // https://webpack.github.io/docs/configuration.html#node
  // https://github.com/webpack/node-libs-browser/tree/master/mock

  node: {
    global: true,
    __filename: true,
    __dirname: true,
  },

  resolve: {
    ...baseClientConfig.resolve,
    fallback: {
      fs: false,
      net: false,
      tls: false,
      os: require.resolve("os-browserify/browser"),
      console: require.resolve('console-browserify'),
      process: require.resolve('process/browser'),
    },
    alias: {
      ...baseClientConfig.resolve.alias,
      'react-dom': isRuntimeDev ? '@hot-loader/react-dom' : 'react-dom'
    }
  }
};

//
// Configuration for the server-side bundle (server.ts)
// -----------------------------------------------------------------------------
const baseServerConfig = webpackConfig({ isClient: false });
const serverConfig = {
  ...baseServerConfig,
  name: 'server',
  target: 'node',
  devtool: isDevEnv && useSourceMap ? 'eval-source-map' : false,
  performance: false,
  optimization: {
    minimize: isProdEnv,
    nodeEnv: false,
    sideEffects: 'flag',
    minimizer: isProdEnv ? [
      new TerserPlugin({
        minify: TerserPlugin.esbuildMinify,
        parallel: true
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['advanced', {
            discardComments: {
              removeAll: true
            },
            autoprefixer: {
              add: true,
            },
          }],
        },
      })
    ] : []
  },
  entry: {
    server: [`${paths.appSrc}/server.ts`]
  },
  output: {
    ...baseServerConfig.output,
    path: paths.appBuild,
    filename: '[name].js',
    libraryTarget: 'commonjs2',
  },
  module: {
    ...baseServerConfig.module,
    rules: [
      ...baseServerConfig.module.rules,
      {
        test: /\.(css|scss)$/,
        sideEffects: true,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              esModule: false,
              emit: false
            }
          },
          ...(styleLoaders({ isClient: true })),
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
              sassOptions: {
                includePaths: [
                  // this one for using node_modules as a base folder
                  // this one for using sass as the base folder
                ]
              },
              postcssOptions: {
                ident: 'postcss',
                plugins: [tailwindcss, autoprefixer]
              }
            },
          },
        ],
        include: [
          paths.appSrc,
          paths.appNodeModules,
        ]
      }
    ],
  },
  externals: [
    /^\.\/assets\.json$/,
    nodeExternals({ allowlist: /(\.(css|scss|sss)$)/i })
  ],
  plugins: [
    ...baseServerConfig.plugins,
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // all options are optional
      insert: () => { },
      runtime: false
    }),
    // Define free variables
    // https://webpack.github.io/docs/list-of-plugins.html#defineplugin
    new webpack.DefinePlugin({
      CONFIG: JSON.stringify(config.globals),
      'process.env.DEV_SERVER': isRuntimeDev,
      'process.env.BROWSER': false,
      __DEVTOOLS__: false  // <-------- DISABLE redux-devtools HERE
    }),
    // Do not create separate chunks of the server bundle
    // https://webpack.github.io/docs/list-of-plugins.html#limitchunkcountplugin
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })
  ].filter(Boolean),

  node: {
    global: true,
    __filename: true,
    __dirname: true,
  },

  resolve: {
    ...baseServerConfig.resolve,
    fallback: {
      document: false
    }
  }
};

let configs = [clientConfig, serverConfig];

module.exports = configs;
