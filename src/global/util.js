/**
 * @var {Object} a namespace to store internal utils for use by Firebase.Util methods
 */
var fb = {};
var Firebase;

if( typeof(window) === 'undefined' ) {
   Firebase = require('firebase');
}
else {
   Firebase = window.Firebase;
   if( !Firebase ) { throw new Error('Must include Firebase (http://cdn.firebase.com/v0/firebase.js) before firebase-utils.js'); }
}

(function(exports, fb) {
   var undefined;

   /**
    * Creates a namespace for packages inside the fb object
    * @param {String} name
    */
   fb.package = function(name) { fb[name] || (fb[name] = {}); return fb[name]; };

   var util = fb.package('util');

   util.isObject = function(v) {
      return !!v && typeof(v) === 'object';
   };

   util.isArray = function(v) {
      return (Array.isArray || isArray).call(null, v);
   };

   util.toArray = function(vals) {
      return util.map(vals, function(v, k) { return v; });
   };

   util.extend = function(){
      var args = util.toArray(arguments);
      var recurse = args[0] === true;
      recurse && args.shift();
      for(var i=1; i<arguments.length; i++) {
         for(var key in arguments[i]) {
            if(arguments[i].hasOwnProperty(key)) {
               arguments[0][key] = recurse && util.isObject(arguments[0][key])? util.extend(true, arguments[0][key], arguments[i][key]) : arguments[i][key];
            }
         }
      }
      return arguments[0];
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
      if( !util.isObject(vals) ) { return false; }
      return util.find(vals, function(v) { return true; }) === undefined;
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
    * Create an array using values returned by an iterator
    * @param vals
    * @param iterator
    * @param scope
    * @returns {*}
    */
   util.map = function(vals, iterator, scope) {
      var out = [];
      util.each(vals, function(v, k) {
         out.push(iterator.call(scope||null, v, k));
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
      if( isArguments(vals) ) { vals = Array.prototype.slice.call(vals, 0); }
      if( util.isArray(vals) ) {
         for(var i = 0, len = vals.length; i < len; i++) {
            if( iterator.call(scope||null, vals[i], i) === true ) { return vals[i]; }
         }
      }
      else if( util.isObject(vals) ) {
         var key;
         for (key in vals) {
            if (vals.hasOwnProperty(key) && iterator.call(scope||null, vals[key], key) === true) {
               return vals[key];
            }
         }
      }
      return undefined;
   };

   util.each = function(vals, cb, scope) {
      if( isArguments(vals) ) { vals = Array.prototype.slice.call(vals, 0); }
      if( util.isArray(vals) ) {
         (vals.forEach || forEach).call(vals, cb, scope);
      }
      else if( util.isObject(vals) ) {
         var key;
         for (key in vals) {
            if (vals.hasOwnProperty(key)) {
               cb.call(scope||null, vals[key], key);
            }
         }
      }
   };

   util.indexOf = function(list, item) {
      return (list.indexOf || indexOf).call(list, item);
   };

   // a polyfill for Function.prototype.bind (invoke using call or apply!)
   // credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
   function bind(oThis) {
      if (typeof this !== "function") {
         // closest thing possible to the ECMAScript 5 internal IsCallable function
         throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
         fToBind = this,
         fNOP = function () {},
         fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis
               ? this
               : oThis,
               aArgs.concat(Array.prototype.slice.call(arguments)));
         };

      fNOP.prototype = this.prototype;
      fBound.prototype = new fNOP();

      return fBound;
   }

   // a polyfill for Array.prototype.forEach (invoke using call or apply!)
   // credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
   function forEach(fn, scope) {
      'use strict';
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
      return Object.prototype.toString.call(vArg) === "[object Array]";
   }

   // a polyfill for Array.indexOf
   // credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
   function indexOf(searchElement /*, fromIndex */ ) {
      'use strict';
      if (this == null) {
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
         if (n != n) { // shortcut for verifying if it's NaN
            n = 0;
         } else if (n != 0 && n != Infinity && n != -Infinity) {
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

   // determine if an object is actually an arguments object passed into a function
   function isArguments(args) {
      // typeof null is also 'object', but null throws
      // a TypeError if you access a property.
      // We check for it as a special case so we can
      // safely use properties below.
      if ( args === null ) return false;

      if ( typeof args !== 'object' ) return false;

      // make sure it has the required properties
      if ( typeof args.callee !== 'function' ) return false;
      if ( typeof args.length !== 'number' ) return false;
      if ( args.constructor !== Object ) return false;

      // it passes all the tests
      return true;
   }

   function NotSupportedError(message) {
      this.name = 'NotSupportedError';
      this.message = message;
      this.stack = (new Error()).stack;
   }
   NotSupportedError.prototype = new Error;
   exports.NotSupportedError = NotSupportedError;

   // for running test units and debugging only
   exports._ForTestingOnly = fb;

})(exports, fb);