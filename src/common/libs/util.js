/*jshint unused:vars */
/*jshint bitwise:false */

'use strict';

var undef;
var util = exports;

util.undef = undef;

util.Firebase = global.Firebase || require('firebase');

util.isDefined = function(v) {
  return v !== undef;
};

util.isUndefined = function(v) {
  return v === undef;
};

util.isObject = function(v) {
  return Object.prototype.isPrototypeOf(v);
};

util.isArray = function(v) {
  return (Array.isArray || isArray).call(null, v);
};

/**
 * @param v value to test or if `key` is provided, the object containing method
 * @param {string} [key] if provided, v is an object and this is the method we want to find
 * @returns {*}
 */
util.isFunction = function(v, key) {
  if( typeof(key) === 'string' ) {
    return util.isObject(v) && util.has(v, key) && typeof(v[key]) === 'function';
  }
  else {
    return typeof(v) === 'function';
  }
};

util.toArray = function(vals, startFrom) {
  var newVals = util.map(vals, function(v, k) { return v; });
  return startFrom > 0? newVals.slice(startFrom) : newVals;
};

/**
 * @param {boolean} [recursive] if true, keys are merged recursively, otherwise, they replace the base
 * @param {...object} base
 * @returns {Object}
 */
util.extend = function(recursive, base) {
  var args = util.toArray(arguments);
  var recurse = typeof args[0] === 'boolean' && args.shift();
  var out = args.shift();
  util.each(args, function(o) {
    if( util.isObject(o) ) {
      util.each(o, function(v,k) {
        out[k] = recurse && util.isObject(out[k])? util.extend(true, out[k], v) : v;
      });
    }
  });
  return out;
};

util.bind = function(fn, scope) {
  var args = Array.prototype.slice.call(arguments, 1);
  return (fn.bind || bind).apply(fn, args);
};

/**
 * @param {Object|Array} vals
 * @returns {boolean}
 */
util.isEmpty = function(vals) {
  return vals === undef || vals === null ||
    (util.isArray(vals) && vals.length === 0) ||
    (util.isObject(vals) && !util.contains(vals, function(v) { return true; }));
};

/**
 * @param {Object|Array} vals
 * @returns {Array} of keys
 */
util.keys = function(vals) {
  var keys = [];
  util.each(vals, function(v, k) { keys.push(k); });
  return keys;
};

/**
 * Create an array using values returned by an iterator. Undefined values
 * are discarded.
 *
 * @param vals
 * @param iterator
 * @param scope
 * @returns {*}
 */
util.map = function(vals, iterator, scope) {
  var out = [];
  util.each(vals, function(v, k) {
    var res = iterator.call(scope, v, k, vals);
    if( res !== undef ) { out.push(res); }
  });
  return out;
};

/**
 *
 * @param {Object} list
 * @param {Function} iterator
 * @param {Object} [scope]
 */
util.mapObject = function(list, iterator, scope) {
  var out = {};
  util.each(list, function(v,k) {
    var res = iterator.call(scope, v, k, list);
    if( res !== undef ) {
      out[k] = res;
    }
  });
  return out;
};

/**
 * Returns the first match
 * @param {Object|Array} vals
 * @param {Function} iterator
 * @param {Object} [scope] set `this` in the callback
 */
util.find = function(vals, iterator, scope) {
  if( util.isArray(vals) ) {
    for(var i = 0, len = vals.length; i < len; i++) {
      if( iterator.call(scope, vals[i], i, vals) === true ) { return vals[i]; }
    }
  }
  else if( util.isObject(vals) ) {
    var key;
    for (key in vals) {
      if (vals.hasOwnProperty(key) && iterator.call(scope, vals[key], key, vals) === true) {
        return vals[key];
      }
    }
  }
  return undef;
};

util.filter = function(list, iterator, scope) {
  var isArray = util.isArray(list);
  var out = isArray? [] : {};
  util.each(list, function(v,k) {
    if( iterator.call(scope, v, k, list) ) {
      if( isArray ) {
        out.push(v);
      }
      else {
        out[k] = v;
      }
    }
  });
  return out;
};

util.reduce = function(list, accumulator, iterator) {
  util.each(list, function(v, k) {
    accumulator = iterator(accumulator, v, k, list);
  });
  return accumulator;
};

util.has = function(vals, key) {
  return util.isObject(vals) && vals[key] !== undef;
};

util.val = function(list, key) {
  return util.has(list, key)? list[key] : undef;
};

util.contains = function(vals, iterator, scope) {
  if( typeof(iterator) !== 'function' ) {
    if( util.isArray(vals) ) {
      return util.indexOf(vals, iterator) > -1;
    }
    iterator = (function(testVal) {
      return function(v) { return v === testVal; };
    })(iterator);
  }
  return util.find(vals, iterator, scope) !== undef;
};

util.each = function(vals, cb, scope) {
  if( util.isArray(vals) || isArguments(vals) ) {
    (vals.forEach || forEach).call(vals, cb, scope);
  }
  else if( util.isObject(vals) ) {
    var key;
    for (key in vals) {
      if (vals.hasOwnProperty(key)) {
        cb.call(scope, vals[key], key, vals);
      }
    }
  }
};

util.indexOf = function(list, item) {
  return (list.indexOf || indexOf).call(list, item);
};

util.remove = function(list, item) {
  var res = false;
  if( util.isArray(list) ) {
    var i = util.indexOf(list, item);
    if( i > -1 ) {
      list.splice(i, 1);
      res = true;
    }
  }
  else if( util.isObject(list) ) {
    var key;
    for (key in list) {
      if (list.hasOwnProperty(key) && item === list[key]) {
        res = true;
        delete list[key];
        break;
      }
    }
  }
  return res;
};

/**
 * Invoke a function after a setTimeout(..., 0), to help convert synch callbacks to async ones.
 * Additional args after `scope` will be passed to the fn when it is invoked
 *
 * @param {Function} fn
 * @param {Object} scope the `this` scope inside `fn`
 */
util.defer = function(fn, scope) {
  var args = util.toArray(arguments);
  setTimeout(util.bind.apply(null, args), 0);
};

/**
 * Call a method on each instance contained in the list. Any additional args are passed into the method.
 *
 * @param {Object|Array} list contains instantiated objects
 * @param {String} methodName
 * @return {Array}
 */
util.call = function(list, methodName) {
  var args = util.toArray(arguments, 2);
  var res = [];
  util.each(list, function(o) {
    if( typeof(o) === 'function' && !methodName ) {
      return res.push(o.apply(null, args));
    }
    if( util.isObject(o) && typeof(o[methodName]) === 'function' ) {
      res.push(o[methodName].apply(o, args));
    }
  });
  return res;
};

/**
 * Determine if two variables are equal. They must be:
 *  - of the same type
 *  - arrays must be same length and all values pass isEqual()
 *  - arrays must be in same order
 *  - objects must contain the same keys and their values pass isEqual()
 *  - object keys do not have to be in same order unless objectsSameOrder === true
 *  - primitives must pass ===
 *
 * @param a
 * @param b
 * @param {boolean} [objectsSameOrder]
 * @returns {boolean}
 */
util.isEqual = function(a, b, objectsSameOrder) {
  if( a === b ) { return true; }
  else if( typeof(a) !== typeof(b) ) {
    return false;
  }
  else if( util.isObject(a) && util.isObject(b) ) {
    var isA = util.isArray(a);
    var isB = util.isArray(b);
    if( isA || isB ) {
      return isA && isB && a.length === b.length && !util.contains(a, function(v, i) {
        return !util.isEqual(v, b[i]);
      });
    }
    else {
      var aKeys = objectsSameOrder? util.keys(a) : util.keys(a).sort();
      var bKeys = objectsSameOrder? util.keys(b) : util.keys(b).sort();
      return util.isEqual(aKeys, bKeys) &&
        !util.contains(a, function(v, k) { return !util.isEqual(v, b[k]); });
    }
  }
  else {
    return false;
  }
};

util.bindAll = function(context, methods) {
  util.each(methods, function(m,k) {
    if( typeof(m) === 'function' ) {
      methods[k] = util.bind(m, context);
    }
  });
  return methods;
};

util.printf = function() {
  var localArgs = util.toArray(arguments);
  var template = localArgs.shift();
  var matches = template.match(/(%s|%d|%j)/g);
  if( matches ) {
    util.each(matches, function (m) {
      template = template.replace(m, format(localArgs.shift(), m));
    });
  }
  return template;
};

// credits: http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
util.construct = function(constructor, args) {
  function F() {
    return constructor.apply(this, args);
  }
  F.prototype = constructor.prototype;
  return new F();
};

util.noop = function() {};

var wrappingClasses = [];
util.isFirebaseRef = function(x) {
  // necessary because instanceof won't work on Firebase Query objects
  // so we can't simply do instanceof here
  var proto = util.isObject(x)? Object.getPrototypeOf(x) : false;
  if( proto && proto.constructor === util.Firebase.prototype.constructor ) {
    return true;
  }
  return util.find(wrappingClasses, function(C) {
    return x instanceof C;
  });
};

// Add a Class as a valid substitute for a Firebase reference, so that it will
// pass util.isFirebaseRef(). This means that it must provide all the Firebase
// API methods and behave exactly like a Firebase instance in all cases.
util.registerFirebaseWrapper = function(WrappingClass) {
  wrappingClasses.push(WrappingClass);
};

// for test units
util._mockFirebaseRef = function(mock) {
  util.Firebase = mock;
};

util.escapeEmail = function(email) {
  return (email||'').replace('.', ',');
};

/**
 * Inherit prototype of another JS class. Adds an _super() method for the constructor to call.
 * It takes any number of arguments (whatever the inherited classes constructor methods are),
 *
 * Limitations:
 *    1. Inherited constructor must be callable with no arguments (to make instanceof work), but can be called
 *       properly during instantiation with arguments by using _super(this, args...)
 *    2. Can only inherit one super class, no exceptions
 *    3. Cannot call prototype = {} after using this method
 *
 * @param {Function} Child
 * @param {Function} Parent a class which can be constructed without passing any arguments
 * @returns {Function}
 */
util.inherits = function(Child, Parent) {
  var methodSets = [Child.prototype].concat(util.toArray(arguments).slice(2));
  Child.prototype = new Parent();
  Child.prototype.constructor = Parent;
  util.each(methodSets, function(fnSet) {
    util.each(fnSet, function(fn, key) {
      Child.prototype[key] = fn;
    });
  });
  Child.prototype._super = function() {
    Parent.apply(this, arguments);
  };
  return Child;
};

util.deepCopy = function(data) {
  if( !util.isObject(data) ) { return data; }
  var out = util.isArray(data)? [] : {};
  util.each(data, function(v,k) {
    out[k] = util.deepCopy(v);
  });
  return out;
};

util.pick = function(obj, keys) {
  if( !util.isObject(obj) ) { return {}; }
  var out = util.isArray(obj)? [] : {};
  util.each(keys, function(k) {
    out[k] = obj[k];
  });
  return out;
};

function format(v, type) {
  switch(type) {
    case '%d':
      return parseInt(v, 10);
    case '%j':
      v =  util.isObject(v)? JSON.stringify(v) : v+'';
      if(v.length > 500) {
        v = v.substr(0, 500)+'.../*truncated*/...}';
      }
      return v;
    case '%s':
      return v + '';
    default:
      return v;
  }
}

function isArguments(o) {
  return util.isObject(o) && o+'' === '[object Arguments]';
}

/****************************************
 * POLYFILLS
 ****************************************/

// a polyfill for Function.prototype.bind (invoke using call or apply!)
// credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
function bind(oThis) {
  /*jshint validthis:true */
  if (typeof this !== 'function') {
    // closest thing possible to the ECMAScript 5 internal IsCallable function
    throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
  }

  var aArgs = Array.prototype.slice.call(arguments, 1),
    fToBind = this,
    FNOP = function () {},
    fBound = function () {
      return fToBind.apply(
          this instanceof FNOP && oThis? this : oThis,
          aArgs.concat(Array.prototype.slice.call(arguments))
      );
    };

  FNOP.prototype = this.prototype;
  fBound.prototype = new FNOP();

  return fBound;
}

// a polyfill for Array.prototype.forEach (invoke using call or apply!)
// credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
function forEach(fn, scope) {
  /*jshint validthis:true */
  var i, len;
  for (i = 0, len = this.length; i < len; ++i) {
    if (i in this) {
      fn.call(scope, this[i], i, this);
    }
  }
}

// a polyfill for Array.isArray
// credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
function isArray(vArg) {
  return Object.prototype.toString.call(vArg) === '[object Array]';
}

// a polyfill for Array.indexOf
// credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
function indexOf(searchElement, fromIndex) {
  /*jshint validthis:true */
  if (this === null) {
    throw new TypeError();
  }
  var n, k, t = Object(this),
    len = t.length >>> 0;

  if (len === 0) {
    return -1;
  }
  n = 0;
  if (arguments.length > 1) {
    n = Number(arguments[1]);
    if (n !== n) { // shortcut for verifying if it's NaN
      n = 0;
    } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
      n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }
  }
  if (n >= len) {
    return -1;
  }
  for (k = n >= 0 ? n : Math.max(len - Math.abs(n), 0); k < len; k++) {
    if (k in t && t[k] === searchElement) {
      return k;
    }
  }
  return -1;
}
