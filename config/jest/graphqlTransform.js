'use strict';

const loader = require('graphql-Tag/loader');

module.exports = {
  process(src) {
    return loader.call({ cacheable() {} }, src);
  },
};