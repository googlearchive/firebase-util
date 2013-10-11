"use strict";

/**
 * @var {Object} a namespace to store internal tools and classes.
 */
var fbutil = {};

(function(exports, fbutil) {

   fbutil.isObject = function(v) {
      return !!v && typeof(v) === 'object';
   };

   fbutil.isArray = function(v) {
      return (Array.isArray || isArray).call(null, v);
   };

   fbutil.extend = function(){
      for(var i=1; i<arguments.length; i++)
         for(var key in arguments[i])
            if(arguments[i].hasOwnProperty(key))
               arguments[0][key] = arguments[i][key];
      return arguments[0];
   };

   fbutil.bind = function(fn, scope) {
      var args = Array.prototype.slice.call(arguments, 1);
      return (fn.bind || bind).apply(fn, args);
   };

   fbutil.each = function(vals, cb, scope) {
      if( isArguments(vals) ) { vals = Array.prototype.slice.call(vals, 0); }
      if( fbutil.isArray(vals) ) {
         (vals.forEach || forEach).call(vals, cb, scope);
      }
      else if( fbutil.isObject(vals) ) {
         var key;
         for (key in vals) {
            if (vals.hasOwnProperty(key)) {
               cb.call(scope||null, vals[key], key);
            }
         }
      }
   };

//   fbutil.map = function(vals, cb, scope) {
//      var out = [];
//      fbutil.each(vals, function(v) {
//         out.push(cb(v));
//      }, scope);
//      return out;
//   };

   // a polyfill for Function.prototype.bind (invoke using call or apply!)
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
   function isArray(vArg) {
      return Object.prototype.toString.call(vArg) === "[object Array]";
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

   // allows test units to access these internal methods
   exports._fbutilObjectForTestingOnly = fbutil;

})(exports, fbutil);