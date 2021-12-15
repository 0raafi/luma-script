const http = require('http');

module.exports = async(url) => new Promise((resolve, reject) =>
  http.get(url, res => resolve(res)).on('error', err => reject(err))
);
