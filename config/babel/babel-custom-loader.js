const paths = require('../paths');

module.exports = () => {
  return {
    customOptions({ transform_runtime, ...loader }) {
      return {
        loader,
        custom: { ...transform_runtime }
      };
    },
    config(cfg) {
      return {
        ...cfg.options,
        presets: [
          [
            require('@babel/preset-env'),
            {
              modules: false,
              useBuiltIns: "entry",
              corejs: 3
            }
          ],
          require('@babel/preset-react'),
          
        ],
        plugins: [
          require('@babel/plugin-transform-runtime'),
          require('@babel/plugin-proposal-function-bind'),
          require('@babel/plugin-proposal-export-default-from'),
          require('@babel/plugin-proposal-export-namespace-from'),
          require('@babel/plugin-proposal-throw-expressions'),
          require('@babel/plugin-syntax-dynamic-import'),
          require('@babel/plugin-proposal-json-strings'),
          require('@loadable/babel-plugin'),
          [require('babel-plugin-transform-imports')],
          [require('@babel/plugin-proposal-decorators'), {
            legacy: true
          }],
          [require('@babel/plugin-proposal-optional-chaining'), {
            loose: false
          }],
          [require('@babel/plugin-proposal-class-properties'), {
            loose: true
          }],
          [require('babel-plugin-add-module-exports'), {
            addDefaultProperty: true
          }],
          ...(cfg.options.compact ? [
            require('@babel/plugin-transform-react-inline-elements'),
            require('@babel/plugin-transform-react-constant-elements')
          ] : []),
          ...(cfg.options.plugins || [])
        ],
      };
    },
    result(result) {
      return {
        ...result,
        code: `${result.code} \n// Generated by babel-custom-loader`
      };
    },
  };
};