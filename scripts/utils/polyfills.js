if (typeof window !== 'undefined') {
  require('intersection-observer');

  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (callback, thisArg) {
      thisArg = thisArg || window;
      for (var i = 0; i < this.length; i++) {
        callback.call(thisArg, this[i], i, this);
      }
    };
  }

  if (typeof Promise === 'undefined') {
    require('promise/lib/rejection-tracking').enable();
    window.Promise = require('promise/lib/es6-extensions.js');
  }
}

if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
      if (this === null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);
      var len = o.length >>> 0;

      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      var thisArg = arguments[1];
      var k = 0;

      while (k < len) {
        var kValue = o[k];

        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        k++;
      }

      return undefined;
    }
  });
}

if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    'use strict';
    if (typeof start !== 'number') {
      start = 0;
    }

    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
Promise.prototype.finally = Promise.prototype.finally || {
  finally (fn) {
    const onFinally = value => Promise.resolve(fn()).then(() => value);

    return this.then(
      result => onFinally(result),
      reason => onFinally(Promise.reject(reason))
    );
  }
}.finally;

if (typeof Object.entries !== 'function') {
  Object.entries = (obj) => {
    const props = Object.keys(obj);
    let i = props.length;
    const resArray = new Array(i);

    while (i--) {
      resArray[i] = [props[i], obj[props[i]]];
    }

    return resArray;
  };
}

Array.prototype.includes = Array.prototype.includes || function(search){
  return !!~this.indexOf(search);
};


const getGlobal = function () {
  if (typeof window !== 'undefined') { return window; }
  if (typeof global !== 'undefined') { return global; }
  throw new Error('unable to locate global object');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/ban-ts-comment
// @ts-ignore
const globalThis = getGlobal();
