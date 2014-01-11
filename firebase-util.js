/*! Firebase-util - v0.1.2 - 2014-01-11
* https://github.com/firebase/firebase-util
* Copyright (c) 2014 Firebase
* MIT LICENSE */

(function(exports) {

/**
 * @var {Object} a namespace to store internal utils for use by Firebase.Util methods
 */
var fb = {};

(function(exports, fb) {
   var undefined;

   var Firebase;

   if( typeof(window) === 'undefined' ) {
      Firebase = require('firebase');
   }
   else {
      Firebase = window.Firebase;
      if( !Firebase ) { throw new Error('Must include Firebase (http://cdn.firebase.com/v0/firebase.js) before firebase-util.js'); }
   }

   /**
    * Creates a namespace for packages inside the fb object
    * @param {String} name
    */
   fb.pkg = function(name) { fb[name] || (fb[name] = {}); return fb[name]; };

   var util = fb.pkg('util');
   util.Firebase = Firebase;

   util.isDefined = function(v) {
      return v !== undefined;
   };

   util.isObject = function(v) {
      return v !== null && typeof(v) === 'object';
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
   util.extend = function(recursive, base){
      var args = util.toArray(arguments);
      var recurse = args[0] === true && args.shift();
      var out = args.shift();
      util.each(args, function(o) {
         util.isObject(o) && util.each(o, function(v,k) {
            out[k] = recurse && util.isObject(out[k])? util.extend(true, out[k], v) : v;
         });
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
      return vals === undefined || vals === null ||
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
         if( res !== undefined ) { out.push(res); }
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
         if( res !== undefined ) {
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
      if( isArguments(vals) ) { vals = Array.prototype.slice.call(vals, 0); }
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
      return undefined;
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

   util.has = function(vals, key) {
      return (util.isArray(vals) && vals[key] !== undefined)
         || (util.isObject(vals) && vals[key] !== undefined)
         || false;
   };

   util.val = function(list, key) {
      return util.has(list, key)? list[key] : undefined;
   };

   util.contains = function(vals, iterator, scope) {
      if( typeof(iterator) !== 'function' ) {
         if( util.isArray(vals) ) {
            return util.indexOf(vals, iterator) > -1;
         }
         iterator = (function(testVal) {
            return function(v) { return v === testVal; }
         })(iterator);
      }
      return util.find(vals, iterator, scope) !== undefined;
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
    * Inherit prototype of another JS class. Adds an _super() method for the constructor to call.
    * It takes any number of arguments (whatever the inherited classes constructor methods are),
    * the first of which must be the `this` instance.
    *
    * Limitations:
    *    1. Inherited constructor must be callable with no arguments (to make instanceof work), but can be called
    *       properly during instantiation with arguments by using _super(this, args...)
    *    2. Can only inherit one super class, no exceptions
    *    3. Cannot call prototype = {} after using this method
    *
    * @param {Function} InheritingClass
    * @param {Function} InheritedClass a class which can be constructed without passing any arguments
    * @returns {Function}
    */
   util.inherit = function(InheritingClass, InheritedClass) {
      // make sure we don't blow away any existing prototype methods on the object
      // and also accept additional arguments to inherit() and extend the prototype accordingly
      var moreFns = [InheritingClass.prototype || {}].concat(util.toArray(arguments, 2));

      InheritingClass.prototype = new InheritedClass;
      util.each(moreFns, function(fns) {
         util.extend(InheritingClass.prototype, fns);
      });

      InheritingClass.prototype._super = function(self) {
         InheritedClass.apply(self, util.toArray(arguments,1));
      };

      return InheritingClass;
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
         util.isObject(o) && typeof(o[methodName]) === 'function' && res.push(o[methodName].apply(o, args));
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
            return util.isEqual(aKeys, bKeys)
               && !util.contains(a, function(v, k) { return !util.isEqual(v, b[k]) });
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
      matches && fb.util.each(matches, function(m) {
         template = template.replace(m, format(localArgs.shift(), m));
      });
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

   /** necessary because instanceof won't work Firebase Query objects */
   util.isFirebaseRef = function(ref) {
      return ref instanceof util.Firebase || (util.isFunction(ref, 'ref') && ref.ref() instanceof util.Firebase);
   };

   function format(v, type) {
      switch(type) {
         case '%d':
            return parseInt(v, 10);
         case '%j':
            v =  fb.util.isObject(v)? JSON.stringify(v) : v+'';
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
   exports.NotSupportedError = util.NotSupportedError = NotSupportedError;

   // for running test units and debugging only
   exports._ForTestingOnly = fb;

})(exports, fb);
(function (exports, fb) {
   var undefined;
   var DEFAULT_LEVEL = 2; //  errors and warnings

   var oldDebuggingLevel = false;
   var fakeConsole = {
      error: noop, warn: noop, info: noop, log: noop, debug: noop, time: noop, timeEnd: noop, group: noop, groupEnd: noop
   };
   var logger = function() {
      logger.log.apply(null, fb.util.toArray(arguments));
   };

   /**
    * @param {int} level use -1 to turn off all logging, use 5 for maximum debugging
    * @param {string|RegExp} [grep] filter logs to those whose first value matches this text or expression
    */
   exports.logLevel = logger.logLevel = function(level, grep) {
      if( typeof(level) !== 'number' ) { level = levelInt(level); }

      if( oldDebuggingLevel === level ) { return function() {}; }

      fb.util.each(['error', 'warn', 'info', 'log', 'debug'], function(k, i) {
         if( typeof(console) !== 'undefined' && level >= i+1 ) {
            // binding is necessary to prevent IE 8/9 from having a spaz when
            // .apply and .call are used on console methods
            var fn = fb.util.bind(console[k==='debug'? 'log' : k], console);
            logger[k] = function() {
               var args = fb.util.toArray(arguments);
               if( typeof(args[0]) === 'string' && args[0].match(/(%s|%d|%j)/) ) {
                  args = printf(args);
               }
               if( !grep || !filterThis(grep, args) ) {
                  fn.apply(typeof(console) === 'undefined'? fakeConsole : console, args);
               }
            };
         }
         else {
            logger[k] = noop;
         }
      });

      // provide a way to revert the debugging level if I want to change it temporarily
      var off = (function(x) {
         return function() { exports.logLevel(x) };
      })(oldDebuggingLevel);
      oldDebuggingLevel = level;

      return off;
   };

   function getDebugLevel() {
      var m;
      if( typeof(window) !== 'undefined' && window.location && window.location.search ) {
         m = window.location.search.match('\bdebugLevel=([0-9]+)\b');
      }
      return m? parseInt(m[1], 10) : DEFAULT_LEVEL;
   }

   function noop() { return true; }

   function printf(args) {
      var localArgs = args.slice(0); // make a copy
      var template = localArgs.shift();
      var matches = template.match(/(%s|%d|%j)/g);
      matches && fb.util.each(matches, function(m) {
         template = template.replace(m, format(localArgs.shift(), m));
      });
      return [template].concat(localArgs);
   }

   function format(v, type) {
      switch(type) {
         case '%d':
            return parseInt(v, 10);
         case '%j':
            v =  fb.util.isObject(v)? JSON.stringify(v) : v+'';
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

   function filterThis(expr, args) {
      if( !args.length ) {
         return true;
      }
      else if( expr instanceof RegExp ) {
         return !expr.test(args[0]+'');
      }
      else {
         return !(args[0]+'').match(expr);
      }
   }

   function levelName(x) {
      switch(x) {
         case 5: return 'debug';
         case 4: return 'log';
         case 3: return 'info';
         case 2: return 'warn';
         case 1: return 'error';
         case 0: return 'none';
         default: return 'default';
      }
   }

   function levelInt(x) {
      switch(x) {
         case false: return 0;
         case 'off': return 0;
         case 'none': return 0;
         case 'error': return 1;
         case 'warn': return 2;
         case 'warning': return 2;
         case 'info': return 3;
         case 'log': return 4;
         case 'debug': return 5;
         case true: return DEFAULT_LEVEL;
         case 'on': return DEFAULT_LEVEL;
         case 'all': return DEFAULT_LEVEL;
         default: return DEFAULT_LEVEL;
      }
   }

   exports.logLevel(getDebugLevel());
   fb.log = logger;

})(exports, fb);
(function (exports, fb) {
   var log  = fb.pkg('log');
   var util = fb.pkg('util');

   /**
    * A simple observer model for watching events.
    * @param eventsMonitored
    * @param [opts] can contain callbacks for onAdd, onRemove, and onEvent, as well as a list of oneTimeEvents
    * @constructor
    */
   function Observable(eventsMonitored, opts) {
      opts || (opts = {});
      this._observableProps = util.extend(
         { onAdd: util.noop, onRemove: util.noop, onEvent: util.noop, oneTimeEvents: [] },
         opts,
         { eventsMonitored: eventsMonitored, observers: {}, oneTimeResults: {} }
      );
      this.resetObservers();
   }
   Observable.prototype = {
      /**
       * @param {String} event
       * @param {Function|util.Observer} callback
       * @param {Function} [cancelFn]
       * @param {Object} [scope]
       */
      observe: function(event, callback, cancelFn, scope) {
         var args = util.Args('observe', arguments, 2, 4);
         event = args.nextFromWarn(this._observableProps.eventsMonitored);
         if( event ) {
            callback = args.nextReq('function');
            cancelFn = args.next('function');
            scope = args.next('object');
            var obs = new util.Observer(this, event, callback, scope, cancelFn);
            this._observableProps.observers[event].push(obs);
            this._observableProps.onAdd(event, obs);
            this.isOneTimeEvent(event) && checkOneTimeEvents(event, this._observableProps, obs);
         }
         return obs;
      },

      /**
       * @param {String|Array} [event]
       * @returns {boolean}
       */
      hasObservers: function(event) {
         return this.getObservers(event).length > 0;
      },

      /**
       * @param {String|Array} events
       * @param {Function|util.Observer} callback
       * @param {Object} [scope]
       */
      stopObserving: function(events, callback, scope) {
         var args = util.Args('stopObserving', arguments);
         events = args.next(['array', 'string'], this._observableProps.eventsMonitored);
         callback = args.next(['function']);
         scope = args.next(['object']);
         util.each(events, function(event) {
            var removes = [];
            var observers = this.getObservers(event);
            util.each(observers, function(obs) {
               if( obs.matches(event, callback, scope) ) {
                  obs.notifyCancelled(null);
                  removes.push(obs);
               }
            }, this);
            removeAll(this._observableProps.observers[event], removes);
            this._observableProps.onRemove(event, removes);
         }, this);
      },

      /**
       * Turn off all observers and call cancel callbacks with an error
       * @param {String} error
       * @returns {*}
       */
      abortObservers: function(error) {
         var removes = [];
         if( this.hasObservers() ) {
            var observers = this.getObservers().slice();
            util.each(observers, function(obs) {
               obs.notifyCancelled(error);
               removes.push(obs);
            }, this);
            this.resetObservers();
            this._observableProps.onRemove(this.event, removes);
         }
      },

      /**
       * @param {String|Array} [events]
       * @returns {*}
       */
      getObservers: function(events) {
         events = util.Args('getObservers', arguments).listFrom(this._observableProps.eventsMonitored, true);
         return getObserversFor(this._observableProps, events);
      },

      triggerEvent: function(event) {
         var args = util.Args('triggerEvent', arguments);
         var events = args.listFromWarn(this._observableProps.eventsMonitored, true);
         var passThruArgs = args.restAsList();
         if( events ) {
            util.each(events, function(e) {
               if( this.isOneTimeEvent(event) ) {
                  if( util.isArray(this._observableProps.oneTimeResults, event) ) {
                     log.warn('One time event was triggered twice, should by definition be triggered once', event);
                     return;
                  }
                  this._observableProps.oneTimeResults[event] = passThruArgs;
               }
               var observers = this.getObservers(e), ct = 0;
   //            log('triggering %s for %d observers with args', event, observers.length, args, onEvent);
               util.each(observers, function(obs) {
                  obs.notify.apply(obs, passThruArgs.slice(0));
                  ct++;
               });
               this._observableProps.onEvent.apply(null, [e, ct].concat(passThruArgs.slice(0)));
            }, this);
         }
      },

      resetObservers: function() {
         util.each(this._observableProps.eventsMonitored, function(key) {
            this._observableProps.observers[key] = [];
         }, this);
      },

      isOneTimeEvent: function(event) {
         return util.contains(this._observableProps.oneTimeEvents, event);
      },

      observeOnce: function(event, callback, cancelFn, scope) {
         var args = util.Args('observeOnce', arguments, 2, 4);
         event = args.nextFromWarn(this._observableProps.eventsMonitored);
         if( event ) {
            callback = args.nextReq('function');
            cancelFn = args.next('function');
            scope = args.next('object');
            var obs = new util.Observer(this, event, callback, scope, cancelFn, true);
            this._observableProps.observers[event].push(obs);
            this._observableProps.onAdd(event, obs);
            this.isOneTimeEvent(event) && checkOneTimeEvents(event, this._observableProps, obs);
         }
         return obs;
      }
   };

   function removeAll(list, items) {
      util.each(items, function(x) {
         var i = util.indexOf(list, x);
         if( i >= 0 ) {
            list.splice(i, 1);
         }
      });
   }

   function getObserversFor(props, events) {
      var out = [];
      util.each(events, function(event) {
         if( !util.has(props.observers, event) ) {
            log.warn('Observable.hasObservers: invalid event type %s', event);
         }
         else {
            if( props.observers[event].length ) {
               out = out.concat(props.observers[event]);
            }
         }
      });
      return out;
   }

   function checkOneTimeEvents(event, props, obs) {
      if( util.has(props.oneTimeResults, event) ) {
         obs.notify.apply(obs, props.oneTimeResults[event]);
      }
   }

   util.Observable = Observable;
})(exports, fb);
(function (exports, fb) {
   var undefined;
   var util = fb.pkg('util');

   /** Observer
    ***************************************************
    * @private
    * @constructor
    */
   function Observer(observable, event, notifyFn, context, cancelFn, oneTimeEvent) {
      if( typeof(notifyFn) !== 'function' ) {
         throw new Error('Must provide a valid notifyFn');
      }
      this.observable = observable;
      this.fn = notifyFn;
      this.event = event;
      this.cancelFn = cancelFn||function() {};
      this.context = context;
      this.oneTimeEvent = !!oneTimeEvent;
   }

   Observer.prototype = {
      notify: function() {
         var args = util.toArray(arguments);
         this.fn.apply(this.context, args);
         if( this.oneTimeEvent ) {
            this.observable.stopObserving(this.event, this.fn, this.context);
         }
      },

      matches: function(event, fn, context) {
         if( util.isArray(event) ) {
            return util.contains(event, function(e) {
               return this.matches(e, fn, context);
            }, this);
         }
         return (!event || event === this.event)
            && (!fn || fn === this || fn === this.fn)
            && (!context || context === this.context);
      },

      notifyCancelled: function(err) {
         this.cancelFn.call(this.context, err||null, this);
      }
   };

   util.Observer = Observer;

})(exports, fb);
(function (exports, fb) {
   var util = fb.pkg('util');

   function Queue(criteriaFunctions) {
      this.needs = 0;
      this.met = 0;
      this.queued = [];
      this.errors = [];
      this.criteria = [];
      this.processing = false;
      util.each(criteriaFunctions, this.addCriteria, this);
   }

   Queue.prototype = {
      /**
       * @param {Function} criteriaFn
       * @param {Object} [scope]
       */
      addCriteria: function(criteriaFn, scope) {
         if( this.processing ) {
            throw new Error('Cannot call addCriteria() after invoking done(), fail(), or handler() methods');
         }
         this.criteria.push(scope? [criteriaFn, scope] : criteriaFn);
         return this;
      },

      ready: function() {
         return this.needs === this.met;
      },

      done: function(fn, context) {
         fn && this._runOrStore(function() {
            this.hasErrors() || fn.call(context);
         });
         return this;
      },

      fail: function(fn, context) {
         this._runOrStore(function() {
            this.hasErrors() && fn.apply(context, this.getErrors());
         });
         return this;
      },

      handler: function(fn, context) {
         this._runOrStore(function() {
            fn.apply(context, this.hasErrors()? this.getErrors() : [null]);
         });
         return this;
      },

      /**
       * @param {Queue} queue
       */
      chain: function(queue) {
         this.addCriteria(queue.handler, queue);
         return this;
      },

      when: function(def) {
         this._runOrStore(function() {
            if( this.hasErrors() ) {
               def.reject.apply(def, this.getErrors());
            }
            else {
               def.resolve();
            }
         });
      },

      addError: function(e) {
         this.errors.push(e);
      },

      hasErrors: function() {
         return this.errors.length;
      },

      getErrors: function() {
         return this.errors.slice(0);
      },

      _process: function() {
         this.processing = true;
         this.needs = this.criteria.length;
         util.each(this.criteria, this._evaluateCriteria, this);
      },

      _evaluateCriteria: function(criteriaFn) {
         var scope = null;
         if( util.isArray(criteriaFn) ) {
            scope = criteriaFn[1];
            criteriaFn = criteriaFn[0];
         }
         try {
            criteriaFn.call(scope, util.bind(this._criteriaMet, this));
         }
         catch(e) {
            this.addError(e);
         }
      },

      _criteriaMet: function(error) {
         error && this.addError(error);
         this.met++;
         if( this.ready() ) {
            util.each(this.queued, this._run, this);
         }
      },

      _runOrStore: function(fn) {
         this.processing || this._process();
         if( this.ready() ) {
            this._run(fn);
         }
         else {
            this.queued.push(fn);
         }
      },

      _run: function(fn) {
         fn.call(this);
      }
   };

   util.createQueue = function(criteriaFns, callback) {
      var q = new Queue(criteriaFns);
      callback && q.done(callback);
      return q;
   };
})(exports, fb);
/* 6.args.js
 *************************************/
(function(exports, fb) {
   var undefined;
   var util = fb.pkg('util');
   var log = fb.pkg('log');

   function Args(fnName, args, minArgs, maxArgs) {
      if( typeof(fnName) !== 'string' || !util.isObject(args) ) { throw new Error('Args requires at least 2 args: fnName, arguments[, minArgs, maxArgs]')}
      if( !(this instanceof Args) ) { // allow it to be called without `new` prefix
         return new Args(fnName, args, minArgs, maxArgs);
      }
      this.fnName = fnName;
      this.argList = util.toArray(args);
      this.origArgs = util.toArray(args);
      var len = this.length = this.argList.length;
      this.pos = -1;
      if( minArgs === undefined ) { minArgs = 0; }
      if( maxArgs === undefined ) { maxArgs = this.argList.length; }
      if( len < minArgs || len > maxArgs ) {
         var rangeText = maxArgs > minArgs? util.printf('%d to %d', minArgs, maxArgs) : minArgs;
         throw Error(util.printf('%s must be called with %s arguments, but received %d', fnName, rangeText, len));
      }
   }

   Args.prototype = {
      /**
       * Grab the original list of args
       * @return {Array} containing the original arguments
       */
      orig: function() { return this.origArgs.slice(0); },

      /**
       * Return whatever args remain as a list
       * @returns {Array|string|Buffer|Blob|*}
       */
      restAsList: function() {
         return this.argList.slice(0);
      },

      /**
       * Advance the argument list by one and discard the value
       * @return {Args}
       */
      skip: function() {
         if( this.argList.length ) {
            this.pos++;
            this.argList.shift();
         }
         return this;
      },

      /**
       * Read the next optional argument, but only if `types` is true, or it is of a type specified
       * In the case that it is not present, return `defaultValue`
       * @param {boolean|Array|string} types either `true` or one of array, string, object, number, int, boolean, boolean-like, or function
       * @param [defaultValue]
       */
      next: function(types, defaultValue) {
         return this._arg(types, defaultValue, false);
      },

      /**
       * Read the next optional argument, but only if `types` is true, or it is of a type specified. In the case
       * that it is not present, return `defaultValue` and log a warning to the console
       * @param {boolean|Array|string} types either `true` or one of array, string, object, number, int, boolean, boolean-like, or function
       * @param [defaultValue]
       */
      nextWarn: function(types, defaultValue) {
         return this._arg(types, defaultValue, 'warn');
      },

      /**
       * Read the next required argument, but only if `types` is true, or it is of a type specified. In the case
       * that it is not present, throw an Error
       * @param {boolean|Array|string} types either `true` or one of array, string, object, number, int, boolean, boolean-like, or function
       */
      nextReq: function(types) {
         return this._arg(types, null, true);
      },

      /**
       * Read the next optional argument, which must be one of the values in choices. If it is not present,
       * return defaultValue.
       * @param {Array} choices a list of allowed values
       * @param [defaultValue]
       */
      nextFrom: function(choices, defaultValue) {
         return this._from(choices, defaultValue, false);
      },

      /**
       * Read the next optional argument, which must be one of the values in choices. If it is not present,
       * return defaultValue and log a warning to the console.
       * @param {Array} choices a list of allowed values
       * @param [defaultValue]
       */
      nextFromWarn: function(choices, defaultValue) {
         return this._from(choices, defaultValue, 'warn');
      },

      /**
       * Read the next optional argument, which must be one of the values in choices. If it is not present,
       * throw an Error.
       * @param {Array} choices a list of allowed values
       */
      nextFromReq: function(choices) {
         return this._from(choices, null, true);
      },

      /**
       * Read the next optional argument and return it as an array (it can optionally be an array or a single value
       * which will be coerced into an array). All values in the argument must be in choices or they are removed
       * from the choices and a warning is logged. If no valid value is present, return defaultValue.
       * @param {Array} choices a list of allowed values
       * @param [defaultValue] a set of defaults, setting this to true uses the `choices` as default
       */
      listFrom: function(choices, defaultValue) {
         return this._list(choices, defaultValue, false);
      },

      /**
       * Read the next optional argument and return it as an array (it can optionally be an array or a single value
       * which will be coerced into an array). All values in the argument must be in choices or they are removed
       * from the choices and a warning is logged. If no valid value is present, return defaultValue and log a warning.
       * @param {Array} choices a list of allowed values
       * @param [defaultValue] a set of defaults, setting this to true uses the `choices` as default
       */
      listFromWarn: function(choices, defaultValue) {
         return this._list(choices, defaultValue, 'warn');
      },

      /**
       * Read the next optional argument and return it as an array (it can optionally be an array or a single value
       * which will be coerced into an array). All values in the argument must be in choices or they are removed
       * from the choices and a warning is logged. If no valid value is present, throw an Error.
       * @param {Array} choices a list of allowed values
       */
      listFromReq: function(choices) {
         return this._list(choices, null, true);
      },

      _arg: function(types, defaultValue, required) {
         this.pos++;
         if( types === undefined || types === null ) { types = true; }
         if( this.argList.length && isOfType(this.argList[0], types) ) {
            return format(this.argList.shift(), types);
         }
         else {
            required && assertRequired(required, this.fnName, this.pos, util.printf('must be of type %s', types));
            return defaultValue;
         }
      },

      _from: function(choices, defaultValue, required) {
         this.pos++;
         if( this.argList.length && util.contains(choices, this.argList[0]) ) {
            return this.argList.shift();
         }
         else {
            required && assertRequired(required, this.fnName, this.pos, util.printf('must be one of %s', choices));
            return defaultValue;
         }
      },

      _list: function(choices, defaultValue, required) {
         this.pos++;
         var out = [];
         var list = this.argList[0];
         if( this.argList.length && !util.isEmpty(list) && (util.isArray(list) || !util.isObject(list)) ) {
            this.argList.shift();
            if( util.isArray(list) ) {
               out = util.map(list, function(v) {
                  if( util.contains(choices, v) ) {
                     return v;
                  }
                  else {
                     badChoiceWarning(this.fnName, v, choices);
                     return undefined;
                  }
               }, this);
            }
            else {
               if( util.contains(choices, list) ) {
                  out = [list];
               }
               else {
                  badChoiceWarning(this.fnName, list, choices);
               }
            }
         }
         if( util.isEmpty(out) ) {
            required && assertRequired(required, this.fnName, this.pos, util.printf('choices must be in [%s]', choices));
            return defaultValue === true? choices : defaultValue;
         }
         return out;
      }

   };

   function isOfType(val, types) {
      if( types === true ) { return true; }
      if( !util.isArray(types) ) { types = [types]; }
      return util.contains(types, function(type) {
         switch(type) {
            case 'array':
               return util.isArray(val);
            case 'string':
               return typeof(val) === 'string';
            case 'number':
               return isFinite(parseInt(val, 10));
            case 'int':
            case 'integer':
               return isFinite(parseFloat(val));
            case 'object':
               return util.isObject(val);
            case 'function':
               return typeof(val) === 'function';
            case 'bool':
            case 'boolean':
               return typeof(val) === 'boolean';
            case 'boolean-like':
               return !util.isObject(val); // be lenient here
            default:
               throw new Error('Args received an invalid data type: '+type);
         }
      });
   }

   function assertRequired(required, fnName, pos, msg) {
      msg = util.printf('%s: invalid argument at pos %d, %s (received %s)', fnName, pos, msg);
      if( required === true ) {
         throw new Error(msg);
      }
      else if( util.has(log, required) ) {
         log[required](msg);
      }
      else {
         throw new Error('The `required` value passed to Args methods must either be true or a method name from logger');
      }
   }

   function badChoiceWarning(fnName, val, choices) {
      log.warn('%s: invalid choice %s, must be one of [%s]', fnName, val, choices);
   }

   function format(val, types) {
      if( types === true ) { return val; }
      switch(util.isArray(types)? types[0] : types) {
         case 'array':
            return util.isArray(val)? val : [val];
         case 'string':
            return val + '';
         case 'number':
            return parseFloat(val);
         case 'int':
         case 'integer':
            return parseInt(val, 10);
         case 'bool':
         case 'boolean':
         case 'boolean-like':
            return !!val;
         case 'function':
         case 'object':
            return val;
         default:
            throw new Error('Args received an invalid data type: '+type);
      }
   }

   util.Args = Args;
})(exports, fb);
(function(exports, fb) {
   "use strict";
   var undefined;
   var util = fb.pkg('util');
   var log  = fb.pkg('log');
   var join = fb.pkg('join');
   var EVENTS = ['child_added', 'child_removed', 'child_changed', 'child_moved', 'value'];

   /**
    * @class JoinedRecord
    * @extends {join.Observer}
    * @param {...object} firebaseRef
    * @constructor
    */
   function JoinedRecord(firebaseRef) {
      this._super(this, EVENTS, util.bindAll(this, {
         onEvent: this._eventTriggered,
         onAdd: this._monitorEvent,
         onRemove: this._stopMonitoringEvent
      }));
      this.joinedParent = null;
      this.paths = [];
      this.sortPath = null;
      this.sortedChildKeys = [];
      this.childRecs = {};
      // values in this hash may be null, use util.has() when
      // checking to see if a record exists!
      this.loadingChildRecs = {};
      this.priorValue = undefined;
      this.currentValue = undefined;
      this.currentPriority = null;
      this.prevChildName  = null;
      this.intersections = [];
      this.refName = null;
      this.rootRef = null;
      this.queue = this._loadPaths(Array.prototype.slice.call(arguments));
   }

   JoinedRecord.prototype = {
      auth: function(authToken, onComplete, onCancel) {
         var args = util.Args('auth', Array.prototype.slice.call(arguments), 1, 3);
         authToken = args.nextReq('string');
         onComplete = args.next('function');
         onCancel = args.next('function');
         this.queue.done(function() {
            this.sortPath.ref().auth(authToken, onComplete, onCancel);
         }, this);
      },

      unauth: function() {
         this.queue.done(function() {
            this.sortPath.ref().unauth();
         }, this);
      },

      on: function(eventType, callback, cancelCallback, context) {
         var args = util.Args('on', Array.prototype.slice.call(arguments), 2, 4);
         eventType = args.nextFromReq(EVENTS);
         callback = args.nextReq('function');
         cancelCallback = args.next('function');
         context = args.next('object');
         this.queue.done(function() {
            var obs = this.observe(eventType, callback, wrapFailCallback(cancelCallback), context);
            this._triggerPreloadedEvents(eventType, obs);
         }, this);
         return callback;
      },

      off: function(eventType, callback, context) {
         var args = util.Args('off', Array.prototype.slice.call(arguments), 0, 3);
         eventType = args.nextFrom(EVENTS);
         callback = args.next('function');
         context = args.next('object');
         this.queue.done(function() {
            this.stopObserving(eventType, callback, context);
         }, this);
         return this;
      },

      once: function(eventType, callback, failureCallback, context) {
         var args = util.Args('once', Array.prototype.slice.call(arguments), 2, 4);
         eventType = args.nextFromReq(EVENTS);
         callback = args.nextReq('function');
         failureCallback = args.next('function');
         context = args.next('object');
         var fn = function(snap, prevChild) {
            if( typeof(callback) === util.Observer )
               callback.notify(snap, prevChild);
            else
               callback.call(context, snap, prevChild);
            this.off(eventType, fn, this);
         };
         this.on(eventType, fn, failureCallback, this);
         return callback;
      },

      child: function(childPath) {
         var args = util.Args('child', Array.prototype.slice.call(arguments), 1, 1);
         childPath = args.nextReq(['string', 'number']);
         var rec;
         var parts = (childPath+'').split('/'), firstPart = parts.shift();
         if( this._isChildLoaded(firstPart) ) {
            // I already have this child record loaded so just return it
            rec = this._getJoinedChild(firstPart);
         }
         else {
            // this is the joined parent, so we fetch a JoinedRecord as the child
            // this constructor syntax is for internal use only and not documented in the API
            rec = new JoinedRecord(firstPart, this);
         }

         // we've only processed the first bit of the child path, so if there are more, fetch them here
         return parts.length? rec.child(parts.join('/')) : rec;
      },

      parent:          function() {
         if( !this.joinedParent ) {
            throw new util.NotSupportedError('Cannot call parent() on a joined record');
         }
         return this.joinedParent;
      },

      name: function() {
         return this.refName;
      },

      set: function(value, onComplete) {
         var args = util.Args('set', Array.prototype.slice.call(arguments), 1, 2).skip();
         onComplete = args.next('function', util.noop);
         this.queue.done(function() {
            if( assertWritable(this.paths, onComplete) && assertValidSet(this.paths, value, onComplete) ) {
               var parsedValue = extractValueForSetOps(value, isSinglePrimitive(this.paths)? this.paths[0] : null);
               var pri = extractPriorityForSetOps(value);
               if( pri !== undefined ) { this.currentPriority = pri; }
               var q = util.createQueue();
               util.each(this.paths, function(path) {
                  q.addCriteria(function(cb) {
                     path.pickAndSet(parsedValue, cb, pri);
                  });
               });
               q.handler(onComplete);
            }
         }, this);
      },

      setWithPriority: function(value, priority, onComplete) {
         if( !util.isObject(value) ) {
            value = {'.value': value};
         }
         else {
            value = util.extend({}, value);
         }
         value['.priority'] = priority;
         return this.set(value, onComplete);
      },

      setPriority:     function(priority, onComplete) {
         var args = util.Args('setPriority', Array.prototype.slice.call(arguments), 1, 2);
         priority = args.nextReq(true);
         onComplete = args.next('function', util.noop);
         this.queue.done(function() {
            if( assertWritable(this.paths, onComplete) ) {
               this.sortPath.ref().setPriority(priority, onComplete);
            }
         }, this);
      },

      update:          function(value, onComplete) {
         onComplete = util.Args('set', Array.prototype.slice.call(arguments), 1, 2).skip().next('function', util.noop);
         this.queue.done(function() {
            if( assertWritable(this.paths, onComplete) && assertValidSet(this.paths, value, onComplete) ) {
               var parsedValue = extractValueForSetOps(value, isSinglePrimitive(this.paths)? this.paths[0] : null);
               var q = util.createQueue();
               util.each(this.paths, function(path) {
                  q.addCriteria(function(cb) {
                     path.pickAndUpdate(parsedValue, cb);
                  });
               });
               q.handler(onComplete);
            }
         }, this);
      },

      remove: function(onComplete) {
         onComplete = util.Args('remove', Array.prototype.slice.call(arguments), 0, 1).next('function', util.noop);
         this.queue.done(function() {
            var q = util.createQueue();
            util.each(this.paths, function(path) {
               q.addCriteria(function(cb) {
                  path.remove(cb);
               })
            });
            q.handler(onComplete);
         }, this);
      },

      push: function(value, onComplete) {
         var args = util.Args('remove', Array.prototype.slice.call(arguments), 0, 2);
         value = args.next();
         onComplete = args.next('function', util.noop);
         var child = this.child(this.rootRef.push().name());
         if( !util.isEmpty(value) ) {
            child.set(value, onComplete);
         }
         return child;
      },

      root:            function() { return this.rootRef; },
      ref:             function() { return this; },

      toString: function() { return '['+util.map(this.paths, function(p) { return p.toString(); }).join('][')+']'; },

      //////// methods that are not allowed
      onDisconnect:    function() { throw new util.NotSupportedError('onDisconnect() not supported on JoinedRecord'); },
      limit:           function() { throw new util.NotSupportedError('limit not supported on JoinedRecord; try calling limit() on ref before passing into join'); },
      endAt:           function() { throw new util.NotSupportedError('endAt not supported on JoinedRecord; try calling endAt() on ref before passing into join'); },
      startAt:         function() { throw new util.NotSupportedError('startAt not supported on JoinedRecord; try calling startAt() on ref before passing into join'); },
      transaction:     function() { throw new util.NotSupportedError('transactions not supported on JoinedRecord'); },

      _monitorEvent: function(eventType) {
         if( this.getObservers(eventType).length === 1 ) {
            this.queue.done(function() {
               paths = this.joinedParent || !this.intersections.length? this.paths : this.intersections;
               if( this.hasObservers(eventType) && !paths[0].hasObservers(eventType) ) {
                  var paths;
                  (this.joinedParent? log.debug : log)('JoinedRecord(%s) Now observing event "%s"', this.name(), eventType);
                  if( this.joinedParent ) {
                     util.call(paths, 'observe', eventType, this._pathNotification, this);
                  }
                  else if( !paths[0].hasObservers() ) {
                     log.info('JoinedRecord(%s) My first observer attached, loading my joined data and Firebase connections', this.name());
                     // this is the first observer, so start up our path listeners
                     util.each(paths, function(path) {
                        util.each(eventsToMonitor(this, path), function(event) {
                           path.observe(event, this._pathNotification, this._pathCancelled, this);
                        }, this)
                     }, this);
                  }
               }
            }, this);
         }
      },

      _stopMonitoringEvent: function(eventType, obsList) {
         var obsCountRemoved = obsList.length;
         this.queue.done(function() {
            if( obsCountRemoved && !this.hasObservers(eventType) ) {
               (this.joinedParent? log.debug : log)('JoinedRecord(%s) Stopped observing %s events', this.name(), eventType? '"'+eventType+'"' : '');
               if( this.joinedParent ) {
                  util.call(this.paths, 'stopObserving', eventType, this._pathNotification, this);
               }
               else if( !this.hasObservers() ) {
                  log.info('JoinedRecord(%s) My last observer detached, releasing my joined data and Firebase connections', this.name());
                  // nobody is monitoring this event anymore, so we'll stop monitoring the path now
                  // and clear all our cached info (reset to nothing)
                  var paths = this.intersections.length? this.intersections : this.paths;
                  util.call(paths, 'stopObserving');
                  var oldRecs = this.childRecs;
                  this.childRecs = {};
                  util.each(oldRecs, this._removeChildRec, this);
                  this.sortedChildKeys = [];
                  this.currentValue = undefined;
                  this.priorValue = undefined;
               }
            }
         }, this);
      },

      /**
       * This is the primary callback used by each Path to notify us that a change has occurred.
       *
       * For a joined child (a record with an id), this monitors all events and triggers them directly
       * from here.
       *
       * But for a joined parent (the master paths where we are fetching joined records from), this method monitors
       * only child_added and child_moved events. Everything else is triggered by watching the child records directly.
       *
       * @param {join.Path} path
       * @param {String} event
       * @param {String} childName
       * @param mappedVals
       * @param {String|null|undefined} prevChild
       * @param {int|null|undefined} priority
       * @private
       */
      _pathNotification: function(path, event, childName, mappedVals, prevChild, priority) {
         var rec;
         log('JoinedRecord(%s) Received "%s" from Path(%s): %s%s %j', this.name(), event, path.name(), event==='value'?'' : childName+': ', prevChild === undefined? '' : '->'+prevChild, mappedVals);

         if( path === this.sortPath && event === 'value' ) {
            this.currentPriority = priority;
         }

         if( this.joinedParent ) {
            // most of the child record events are just pretty much a passthrough
            switch(event) {
               case 'value':
                  this._myValueChanged();
                  break;
               default:
                  this.triggerEvent(event, makeSnap(this.child(childName), mappedVals));
            }
         }
         else {
            rec = this.child(childName);
            switch(event) {
               case 'child_added':
                  if( mappedVals !== null ) {
                     this._pathAddEvent(path, rec, prevChild);
                  }
                  break;
               case 'child_moved':
                  if( this.sortPath === path ) {
                     rec.currentPriority = priority;
                     this._moveChildRec(rec, prevChild);
                  }
                  break;
            }
         }
      },

      _isValueLoaded: function() {
         return this.currentValue !== undefined;
      },

      _isChildLoaded: function(key) {
         if( util.isObject(key) ) { key = key.name(); }
         return this._getJoinedChild(key) !== undefined;
      },

      _pathCancelled: function(err) {
         err && this.abortObservers(err);
      },

      // must be called before any on/off events
      _loadPaths: function(pathArgs) {
         var pathLoader = new join.PathLoader(pathArgs);
         this.joinedParent = pathLoader.joinedParent;
         this.refName = pathLoader.refName;
         this.rootRef = pathLoader.rootRef;
         this.paths = pathLoader.finalPaths;

         return util
            .createQueue()
            .chain(pathLoader.queue)
            .done(this._assertSortPath, this)
            .done(function() {
               this.intersections = pathLoader.intersections;
               this.sortPath = pathLoader.sortPath;
               log.info('JoinedRecord(%s) is ready for use (all paths and dynamic keys loaded)', this.name());
            }, this)
            .fail(function() {
               var name = this.name();
               util.each(Array.prototype.slice.call(arguments), function(err) {
                  log.error('Path(%s): %s', name, err);
               });
               log.error('JoinedRecord(%s) could not be loaded.', name);
            }, this);
      },

      /**
       * Called when a child_added event occurs on a Path I monitor. This does not necessarily result
       * in a child record. But it does result in immediately loading all the joined paths and determining
       * if the record is complete enough to add.
       *
       * @param {join.Path} path
       * @param {JoinedRecord} rec
       * @param {String|null} prevName
       * @returns {*}
       * @private
       */
      _pathAddEvent: function(path, rec, prevName) {
         this._assertIsParent('_pathAddEvent');
         // The child may already exist if another Path has declared it
         // or it may be loading as we speak, so evaluate each case
         var childName = rec.name();
         var isLoading = util.has(this.loadingChildRecs, childName);
         if( !isLoading && !this._isChildLoaded(childName) ) {
            // the record is new: not currently loading and not loaded before
            if( !rec._isValueLoaded() ) {
               log.debug('JoinedRecord(%s) Preloading value for child %s in prep to add it', this.name(), rec.name());
               // the record has no value yet, so we fetch it and then we call _addChildRec again
               this.loadingChildRecs[childName] = prevName;
               rec.once('value', function() {
                  // if the loadingChildRecs entry has been deleted, then the record was immediately removed
                  // after adding it, so don't do anything here, just ignore it
                  if( util.has(this.loadingChildRecs, childName) ) {
                     // the prevName may have been updated while we were fetching the value so we use
                     // the cached one here instead of the prevName argument
                     var prev = this.loadingChildRecs[childName];
                     rec.prevChildName = prev;
                     delete this.loadingChildRecs[childName];
                     this._addChildRec(rec, prev);
                  }
               }, this);
            }
            else {
               this._addChildRec(rec, prevName);
            }
         }
         else if( path === this.sortPath ) {
            // the rec has already been added by at least one other path but this is the sortPath,
            // so it may have been put temporarily into the wrong place based on another path's sort info
            if( isLoading ) {
               // the rec is still loading, so simply change the prev record id
               this.loadingChildRecs[childName] = prevName;
            }
            else {
               // the child has already loaded from another path (this should only happen for unions)
               // so we move it instead
               this._moveChildRec(rec, prevName);
            }
         }
      },

      // only applicable to the parent joined path
      _addChildRec: function(rec, prevName) {
         this._assertIsParent('_addChildRec');
         var childName = rec.name();
         if( rec.currentValue !== null && !this._isChildLoaded(childName) ) {
            log('JoinedRecord(%s) Added child rec %s after %s', this.name(), rec.name(), prevName);
            // the record is new and has already loaded its value and no intersection path returned null,
            // so now we can add it to our child recs
            this._placeRecAfter(rec, prevName);
            this.childRecs[childName] = rec;
            if( this._isValueLoaded() && !util.has(this.currentValue, childName) ) {
               // we only store the currentValue on this record if somebody is monitoring it,
               // otherwise we have to perform a wasteful on('value',...) for all my join paths each
               // time there is a change
               this._setMyValue(join.sortSnapshotData(this, this.currentValue, makeSnap(rec)));
            }
            this.triggerEvent('child_added', makeSnap(rec));
            rec.on('value', this._updateChildRec, this);
         }
         return rec;
      },

      // only applicable to the parent join path
      _removeChildRec: function(rec) {
         this._assertIsParent('_removeChildRec');
         var childName = rec.name();
         rec.off(null, this._updateChildRec, this);
         if( this._isChildLoaded(rec) ) {
            log('JoinedRecord(%s) Removed child rec %s', this.name(), rec);
            var i = util.indexOf(this.sortedChildKeys, childName);
//            rec.off('value', this._updateChildRec, this);
            if( i > -1 ) {
               this.sortedChildKeys.splice(i, 1);
//               if( i < this.sortedChildKeys.length ) {
//                  var nextRec = this.child(this.sortedChildKeys[i]);
//                  nextRec && this.triggerEvent('child_moved', makeSnap(nextRec), i > 0? this.sortedChildKeys[i-1] : null);
//               }
            }
            delete this.childRecs[childName];
            if( this._isValueLoaded() ) {
               var newValue = util.extend({}, this.currentValue);
               delete newValue[childName];
               this._setMyValue(newValue);
            }
            this.triggerEvent('child_removed', makeSnap(rec, rec.priorValue));
         }
         else if( util.has(this.loadingChildRecs, childName) ) {
            // the record is still loading and has already been deleted, so deleting this
            // will call _pathAddEvent to abort when it gets through the load process
            delete this.loadingChildRecs[childName];
         }
         return rec;
      },

      // only applicable to the parent join path
      _updateChildRec: function(snap) {
         this._assertIsParent('_updateChildRec');
         if( this._isChildLoaded(snap.name()) ) {
            // if the child's on('value') listener returns null, then the record has effectively been removed
            if( snap.val() === null ) {
               this._removeChildRec(snap.ref());
            }
            // the first on('value', ...) event will be superfluous, an exact duplicate of the child_added
            // event, so don't retrigger it here, instead, wait for the priorValue to be set so we know
            // it's a legit change event
            else if( snap.ref().priorValue !== undefined ) {
               if( this._isValueLoaded() ) {
                  this._setMyValue(join.sortSnapshotData(this, this.currentValue, snap));
               }
               this.triggerEvent('child_changed', snap);
            }
         }
      },

      // only applicable to parent join path
      _placeRecAfter: function(rec, prevChild) {
         this._assertIsParent('_placeRecAfter');
         var toY, len = this.sortedChildKeys.length, res = null;
         if( !prevChild || len === 0 ) {
            toY = 0;
         }
         else {
            toY = util.indexOf(this.sortedChildKeys, prevChild);
            if( toY === -1 ) {
               toY = len;
            }
            else {
               toY++;
            }
         }
         rec.prevChildName = toY > 0? this.sortedChildKeys[toY-1] : null;
         this.sortedChildKeys.splice(toY, 0, rec.name());
         if( toY < len ) {
            var nextKey = this.sortedChildKeys[toY+1];
            var nextRec = this._getJoinedChild(nextKey);
            nextRec.prevChildName = rec.name();
         }
         return res;
      },

      // only applicable to the parent joined path
      _moveChildRec: function(rec, prevChild) {
         this._assertIsParent('_moveChildRec');
         if( this._isChildLoaded(rec) ) {
            var fromX = util.indexOf(this.sortedChildKeys, rec.name());
            if( fromX > -1 && prevChild !== undefined) {
               var toY = 0;
               if( prevChild !== null ) {
                  toY = util.indexOf(this.sortedChildKeys, prevChild);
                  if( toY === -1 ) { toY = this.sortedChildKeys.length }
               }

               if( fromX > toY ) {
                  toY++;
               }

               if( toY !== fromX ) {
                  this.sortedChildKeys.splice(toY, 0, this.sortedChildKeys.splice(fromX, 1)[0]);
                  rec.prevChildName = toY > 0? this.sortedChildKeys[toY-1] : null;
                  this._isChildLoaded(rec) && this.triggerEvent('child_moved', makeSnap(rec), prevChild);
                  this._setMyValue(join.sortSnapshotData(this, this.currentValue));
               }
            }
         }
      },

      // only applicable to child paths
      _myValueChanged: function() {
         join.buildSnapshot(this).value(function(snap) {
            this._setMyValue(snap.val());
         }, this);
      },

      /**
       * @param newValue
       * @returns {boolean}
       * @private
       */
      _setMyValue: function(newValue) {
         if( !util.isEqual(this.currentValue, newValue, true) ) {
            this.priorValue = this.currentValue;
            this.currentValue = newValue;
            this.joinedParent || this._loadCachedChildren();
            this.triggerEvent('value', makeSnap(this));
            return true;
         }
         return false;
      },

      _notifyExistingRecsAdded: function(obs) {
         this._assertIsParent('_notifyExistingRecsAdded');
         if( this.sortedChildKeys.length ) {
            /** @var {join.SnapshotBuilder} prev */
            var prev = null;
            util.each(this.sortedChildKeys, function(key) {
               if( this._isChildLoaded(key) ) {
                  var rec = this._getJoinedChild(key);
                  obs.notify(makeSnap(rec), prev);
                  prev = rec.name();
               }
            }, this);
         }
      },

      /**
       * Not all triggered events are routed through this method, because sometimes observers
       * are directly notified, instead of calling this.triggerHandler(). Have a look at
       * _triggerPreloadedEvents() for an example (when a new observer is added and we
       * have cached data, we trigger child_added and value for all the local events, but
       * only on that new observer and no existing observers)
       * @private
       */
      _eventTriggered: function(event, obsCount, snap, prevChild) {
         var fn = obsCount? (this.joinedParent? log : log.info) : log.debug;
         fn('JoinedRecord(%s) "%s" (%s%s) sent to %d observers', this.name(), event, snap.name(), prevChild? '->'+prevChild : '', obsCount);
         log.debug(snap.val());
      },

      _getJoinedChild: function(keyName) {
         return this.joinedParent? undefined : this.childRecs[keyName];
      },

      _loadCachedChildren: function() {
         this._assertIsParent('_loadCachedChildren');
         var prev = null;
         util.each(this.currentValue, function(v, k) {
            if( !this._isChildLoaded(k) ) {
               var rec = this.child(k);
               rec.currentValue = v;
               rec.prevChildName = prev;
               this._addChildRec(rec, rec.prevChildName);
            }
            prev = k;
         }, this);
      },

      _assertIsParent: function(fnName) {
         if( this.joinedParent ) { throw new Error(fnName+'() should only be invoked for parent records'); }
      },

      /**
       * Since some records may already be cached locally when value or child_added listeners are attached,
       * we trigger any preloaded data for them immediately to comply with Firebase behavior.
       * @param {String} eventType
       * @param {util.Observer} obs
       * @private
       */
      _triggerPreloadedEvents: function(eventType, obs) {
         if( this._isValueLoaded() ) {
            if( eventType === 'value' ) {
               var snap = makeSnap(this);
               obs.notify(snap);
            }
            else if( eventType === 'child_added' ) {
               if( this.joinedParent ) {
                  var prev = null;
                  fb.util.keys(this.currentValue, function(k) {
                     obs.notify(makeSnap(this.child(k)), prev);
                     prev = k;
                  });
               }
               else {
                  this._notifyExistingRecsAdded(obs);
               }
            }
         }
         else if( eventType === 'value' ) {
            // trigger a 'value' event as soon as my data loads
            this._myValueChanged();
         }
      },

      _isSortPath: function(p) {
         return this.sortPath.equals(p);
      }
   };

   util.inherit(JoinedRecord, util.Observable);

   // only useful for parent joined paths
   function eventsToMonitor(rec, path) {
      var events = [];
      if( path.isIntersection() || !rec.intersections.length ) {
         events.push('child_added');
      }
      if( path === rec.sortPath ) {
         events.push('child_moved');
      }
      return events.length? events : null;
   }

   function makeSnap(rec, val) {
      if( arguments.length === 1 ) { val = rec.currentValue; }
      return new join.JoinedSnapshot(rec, val, rec.currentPriority);
   }

   function wrapFailCallback(fn) {
      return function(err) {
         if( fn && err ) { fn(err); }
      }
   }

   function assertWritable(paths, onComplete) {
      var readOnlyNames = util.map(paths, function(p) { return p.isReadOnly()? p.toString() : undefined });
      if( readOnlyNames.length ) {
         var txt = util.printf('Unable to write to the following paths because they are read-only (no keyMap was not specified and the path contains no data): %s', readOnlyNames);
         log.error(txt);
         onComplete(new util.NotSupportedError(txt));
         return false;
      }
      return true;
   }

   function assertValidSet(paths, value, onComplete) {
      var b = !isPrimitiveValue(value) || isSinglePrimitive(paths);
      if( !b ) {
         log.error('Attempted to call set() using a primitive, but this is a joined record (there is no way to split a primitive between multiple paths)');
         onComplete(new util.NotSupportedError('Attempted to call set() using a primitive, but this is a joined record (there is no way to split a primitive between multiple paths)'));
      }
      return b;
   }

   function extractValueForSetOps(value, primitivePath) {
      var out = value;
      if( util.has(value, '.priority') ) {
         out = util.filter(value, function(v,k) { return k !== '.priority' });
      }
      // we support .value in set() ops like normal Firebase, so extract that here if this is a joined value
      if( util.has(value, '.value') ) {
         out = value['.value'];
      }
      if( primitivePath && isPrimitiveValue(out) ) {
         out = (function(oldVal) {
            var newVal = {};
            newVal[primitivePath.aliasedKey('.value')||'.value'] = oldVal;
            return newVal;
         })(out);
      }
      return out;
   }

   function extractPriorityForSetOps(value) {
      if( util.has(value, '.priority') ) {
         return value['.priority'];
      }
      return undefined;
   }

   function isSinglePrimitive(paths) {
      return paths.length  === 1 && paths[0].isPrimitive();
   }

   function isPrimitiveValue(value) {
      return !util.isObject(value) && value !== null;
   }

   /** add JoinedRecord to package
     ***************************************************/
   join.JoinedRecord = JoinedRecord;

})(exports, fb);

(function(exports, fb) {
   var log  = fb.pkg('log');
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   function JoinedSnapshot(rec, data, priority) {
      this.rec = rec;
      this.priority = priority === undefined? rec.currentPriority : priority;
      this.data = this._loadData(data);
   }

   JoinedSnapshot.prototype = {
      val:         function() { return this.data; },
      child:       function() { return this.rec.child.apply(this.rec, util.toArray(arguments)); },
      forEach:     function(cb) {
         // use find because if cb returns true, then forEach should exit
         return !!util.find(this.data, function(v, k) {
            !util.isEmpty(v) && cb(new JoinedSnapshot(this.child(k), v));
         }, this);
      },

      hasChild:    function(key) {
         var dat = this.data;
         return !util.contains(key.split('/'), function(keyPart) {
            if( util.has(dat, keyPart) ) {
               dat = dat[keyPart];
               return false;
            }
            else {
               return true;
            }
         });
      },

      hasChildren: function() { return util.isObject(this.data) && !util.isEmpty(this.data) },

      name:        function() { return this.rec.name(); },
      numChildren: function() { return util.keys(this.data, function() {return null}).length; },
      ref:         function() { return this.rec; },
      getPriority: function() { return this.priority; },
      exportVal:   function() { throw new Error('Nobody implemented me :('); },

      isEqual: function(val) {
         return util.isEqual(this.data, this._loadData(val), true);
      },

      _loadData: function(data) {
         return util.isEmpty(data)? null : (util.has(data, '.value') && util.keys(data).length === 1? data['.value'] : data);
      }
   };

   fb.join.JoinedSnapshot = JoinedSnapshot;
})(exports, fb);

(function (fb) {
   "use strict";
   var log  = fb.pkg('log');
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   function KeyMapLoader(path, parent) {
      this.queue = util.createQueue();
      this.keyMap = null;
      this.isReadOnly = false;
      this.dynamicChildPaths = {};
      var km = path.getKeyMap();
      if( util.isEmpty(km) ) {
         if( parent ) {
            this._loadKeyMapFromParent(parent);
         }
         else {
            this._loadKeyMapFromData(path);
         }
      }
      else {
         this._parseRawKeymap(km);
      }
   }

   KeyMapLoader.prototype = {
      done: function(callback, context) {
         //todo does not handle failure (security error reading keyMap)
         this.queue.done(function() {
            callback.call(context, this.isReadOnly, this.keyMap, this.dynamicChildPaths);
         }, this);
      },

      fail: function(callback, context) {
         this.queue.fail(callback, context);
      },

      _parseRawKeymap: function(km) {
         var dynamicPaths = {};
         var finalKeyMap = {};
         util.each(km, function(v, k) {
            if( util.isObject(v) ) {
               var toKey = k;
               if( v instanceof util.Firebase || v instanceof join.JoinedRecord ) {
                  v = { ref: v };
               }
               else if(v.aliasedKey) {
                  toKey = v.aliasedKey;
               }
               v.keyMap = {'.value': toKey};
               finalKeyMap[k] = toKey;
               dynamicPaths[k] = new join.Path(v);
            }
            else if( v === true ) {
               finalKeyMap[k] = k;
            }
            else {
               finalKeyMap[k] = v;
            }
         });
         if( !util.isEmpty(dynamicPaths) ) { this.dynamicChildPaths = dynamicPaths; }
         if( !util.isEmpty(finalKeyMap) ) { this.keyMap = finalKeyMap; }
      },

      _loadKeyMapFromParent: function(parent) {
         this.queue.addCriteria(function(cb) {
            parent.observeOnce('keyMapLoaded', function(keyMap) {
               if( parent.isJoinedChild() ) {
                  this.keyMap = { '.value': '.value' };
               }
               else {
                  this.keyMap = util.extend({}, keyMap);
               }
               cb();
            }, this);
         }, this);
      },

      _loadKeyMapFromData: function(path) {
         this.queue.addCriteria(function(cb) {
            // sample several records (but not hundreds) and load the keys from each so
            // we get an accurate union of the fields in the child data; they are supposed
            // to be consistent, but some could have null values for various reasons,
            // so this should help avoid inconsistent keys
            path.ref().limit(25).once('value', function(samplingSnap) {
               var km = {};
               if( util.isObject(samplingSnap.val()) ) {
                  var keys = [];
                  // we sample several records and look for keys so if a key is missing from one or two
                  // we don't get funky and skewed results (we hope)
                  samplingSnap.forEach(function(snap) {
                     keys.push(snap.name());
                     if( util.isObject(snap.val()) ) {
                        // got an object, add an keys in that object to our map
                        util.each(snap.val(), function(v, k) { km[k] = k; });
                        return false;
                     }
                     else if( !util.isEmpty(snap.val()) ) {
                        // got a primitive, so the only key is .value and we cancel iterations
                        km = { '.value': path.ref().name() };
                        return true;
                     }
                     else {
                        return false;
                     }
                  });
                  log.info('Loaded keyMap for Path(%s) from child records "%s": %j', path.toString(), keys, km);
               }
               if( util.isEmpty(km) ) {
                  this.isReadOnly = true;
                  km['.value'] = path.ref().name();
               }
               this.keyMap = km;
               cb();
            }, function(err) {
               log.error(err);
               cb(err);
            }, this);
         }, this);
      }
   };

   join.getKeyMapLoader = function(path, parent) {
      return new KeyMapLoader(path, parent);
   }

})(fb);
(function (fb) {
   "use strict";
   var undefined;
   var log  = fb.pkg('log');
   var util = fb.pkg('util');
   var join = fb.pkg('join');
   var EVENTS = ['child_added', 'child_removed', 'child_moved', 'child_changed', 'value', 'keyMapLoaded', 'dynamicKeyLoaded'];

   /** PATH
    ***************************************************
    * @private
    * @constructor
    */
   function Path(props, parent) {
      this._super(this, EVENTS, util.bindAll(this, {
         onAdd: this._observerAdded,
         onRemove: this._observerRemoved,
         oneTimeEvents: ['keyMapLoaded', 'dynamicKeyLoaded']
      }));
      this.subs = [];
      this.parentPath = parent;
      this.props = buildPathProps(props, parent);
      // map of dynamic fields that have to be loaded separately, see _buildKeyMap() and _parseData()
      this.dynamicChildPaths = null;
      if( !this.props.pathName ) {
         throw new Error('No pathName found; path cannot be set to Firebase root');
      }
      this._buildKeyMap(parent);
      this._initDynamicSource();
   }

   Path.prototype = {
      child: function(aliasedKey) {
         var sourceKey = this.isJoinedChild()? this.sourceKey(aliasedKey) : aliasedKey;
         if( this.hasDynamicChild(sourceKey) ) {
            throw new Error('Cannot use child() to retrieve a dynamic keyMap ref; try loadChild() instead');
         }
         if( sourceKey === undefined ) {
            log.info('Path(%s): Asked for child key "%s"; it is not in my key map', this.name(), aliasedKey);
            sourceKey = aliasedKey;
         }
         if( sourceKey === '.value' ) {
            return this;
         }
         else {
            return new Path(this.ref().child(sourceKey), this);
         }
      },

      /**
       * @param {Firebase} sourceRef path where the dynamic key's value is kept
       * @param {String} aliasedKey name of the key where I put my data
       * @returns {Path}
       */
      dynamicChild: function(sourceRef, aliasedKey) {
         return new Path({
            ref: this.ref(true),
            dynamicSource: sourceRef,
            keyMap: {'.value': aliasedKey},
            sync: this.props.sync
         }, this);
      },

      name: function() { return this.isDynamic()? this.props.pathName+'/'+(this.props.dynamicKey||'<dynamic>') : this.props.pathName; },
      toString: function() { return this.ref()? this.ref().toString() : this.props.ref.toString()+'/<dynamic>'; },

      loadData: function(doneCallback, context) {
         util.defer(function() {
            if( !this.isReadyForOps() ) {
               log.debug('Path(%s) loadData() called but dynamic key has not loaded yet; waiting for dynamicKeyLoaded event', this.name());
               this._waitForReady(doneCallback, context);
            }
            else {
               this.ref(true).once('value', function(snap) {
                  if( this.isJoinedChild() ) {
                     this._parseRecord(snap, doneCallback, context);
                  }
                  else {
                     this._parseRecordSet(snap, doneCallback, context);
                  }
               }, this)
            }
         }, this);
      },

      /**
       * @param data
       * @param callback
       * @param [priority]
       */
      pickAndSet: function(data, callback, priority) {
         if( this.isDynamic() ) {
            log.debug('Path(%s) is dynamic (ready only), so pickAndSet was ignored', this.name());
            callback(null);
         }
         else {
            if( data === null ) {
               this.ref().remove(callback);
            }
            else {
               var finalDat = this._dataForSetOp(data);
               if( this.isSortBy() && priority !== undefined ) {
                  this.ref().setWithPriority(finalDat, priority, callback);
               }
               else {
                  this.ref().set(finalDat, callback);
               }
            }
         }
      },

      pickAndUpdate: function(data, callback) {
         if( !util.isObject(data) ) {
            throw new Error('Update failed: First argument must be an object containing the children to replace.');
         }
         if( this.isDynamic() ) {
            log.debug('Path(%s) is dynamic (ready only), so pickAndUpdate was ignored', this.name());
            callback(null);
         }
         else {
            var finalDat = this._dataForSetOp(data, true);
            if( util.isEmpty(finalDat) ) {
               callback(null);
            }
            else if( this.isPrimitive() ) {
               this.ref().set(finalDat, callback);
            }
            else {
               this.ref().update(finalDat, callback);
            }
         }
      },

      remove: function(cb) { this.ref().remove(cb); },

      isIntersection: function() { return this.props.intersects; },
      isSortBy: function() { return this.props.sortBy; },
      setSortBy: function(b) { this.props.sortBy = b; },

      /**
       * @param {bool} [queryRef]
       */
      ref: function(queryRef) {
         var ref = null;
         if( this.isDynamic() ) {
            if( this.isReadyForOps() ) {
               ref = this.props.ref.child(this.props.dynamicKey);
            }
         }
         else {
            ref = this.props.ref;
         }
         return ref && !queryRef? ref.ref() : ref;
      },

      hasKey: function(aliasedKey) {
         return util.contains(this.getKeyMap(), aliasedKey);
      },

      sourceKey: function(aliasedKey) {
         var res = aliasedKey;
         if( this.isJoinedChild() ) {
            util.find(this.props.keyMap, function(v,k) {
               var isMatch = v === aliasedKey;
               if(isMatch) {
                  res = k;
               }
               return isMatch;
            });
         }
         return res;
      },
      aliasedKey: function(sourceKey) {
         return this.getKeyMap()[sourceKey];
      },

      isJoinedChild: function() { return !!this.parentPath; },

      isPrimitive: function() {
         return util.has(this.getKeyMap(), '.value') && this.isJoinedChild();
      },

      /**
       * Removes a key which exists in two paths. See the reconcilePaths() method in PathLoader.js
       * @param {string} sourceKey
       * @param {Path} owningPath
       */
      removeConflictingKey: function(sourceKey, owningPath) {
         log('Path(%s) cannot use key %s->%s; that destination field is owned by Path(%s). You could specify a keyMap and map them to different destinations if you want both values in the joined data.', this, sourceKey, this.getKeyMap()[sourceKey], owningPath);
         delete this.props.keyMap[sourceKey];
      },

      /**
       * Removes a dynamic key which is going to be assigned as its own path. But keeps track of it so any
       * .id: values will be processed accordingly.
       * @param {string} sourceKey
       */
      suppressDynamicKey: function(sourceKey) {
         this.props.dynamicAbstracts[sourceKey] = this.aliasedKey(sourceKey);
         delete this.props.keyMap[sourceKey];
      },

      /**
       * Unless keyMap is passed in the config, it will be empty until the first data set is fetched!
       * @returns {Object} a hash
       */
      getKeyMap: function() {
         return this.props.keyMap || {};
      },

      /**
       * Iterate each key in this keyMap and call the iterator with args: sourceKey, aliasedKey, value
       * The value is obtained using an aliasedKey from data (which must be an object, primitives should use
       * the aliased key or .value). Dynamic keyMap refs return the id value (not the dynamic data).
       *
       * @param data
       * @param iterator
       * @param [context]
       */
      eachKey: function(data, iterator, context) {
         this._iterateKeys(data, iterator, context, false);
      },

      /**
       * Iterate each key in this keyMap and call the iterator with args: sourceKey, aliasedKey, value
       * The value is obtained using an sourceKey from data (which must be an object, primitives should use
       * the aliased key or .value). Dynamic keyMap refs return the id value (not the dynamic data).
       *
       * @param data
       * @param iterator
       * @param [context]
       */
      eachSourceKey: function(data, iterator, context) {
         this._iterateKeys(data, iterator, context, true);
      },

      getDynamicPaths: function() {
         return this.dynamicChildPaths;
      },

      equals: function(path) {
         return this.isReadyForOps() && path.toString() === this.toString();
      },

      _dataForSetOp: function(data, updatesOnly) {
         var finalDat;
         if( this.isJoinedChild() ) {
            finalDat = this._pickMyData(data, updatesOnly);
         }
         else {
            finalDat = util.mapObject(data, function(rec) {
               return this._pickMyData(rec, updatesOnly);
            }, this);
         }
         return finalDat;
      },

      /**
       * Given a set of keyMapped data, return it to the raw format usable for use in my set/update
       * functions. Dynamic keyMap values are excluded.
       *
       * @param data
       * @param {boolean} updatesOnly only include keys in data, no nulls for other keymap entries
       * @private
       */
      _pickMyData: function(data, updatesOnly) {
         var out = {};
         this.eachKey(data, function(sourceKey, aliasedKey, value, dynKey) {
            if( !updatesOnly || (dynKey && util.has(data, dynKey)) || (!dynKey && util.has(data, aliasedKey)) ) {
               out[sourceKey] = value;
            }
         });
         return util.isEmpty(out)? null : util.has(out, '.value')? out['.value'] : out;
      },

      _observerAdded: function(event) {
         if( this.isOneTimeEvent(event) ) { return; }
         log('Path(%s) Added "%s" observer, %d total', event, this.name(), this.getObservers(event).length);
         if( !this.subs[event] ) {
            this._startObserving(event);
            if( this.isDynamic() && this.getObservers(util.keys(this.subs)).length === 1 ) {
               this._watchDynamicSource();
            }
         }
      },

      _observerRemoved: function(event, obsList) {
         if( this.isOneTimeEvent(event) ) { return; }
         obsList.length && log('Path(%s) Removed %d observers of "%s", %d remaining', event, obsList.length, this.name(), this.getObservers(event).length);
         if( !this.hasObservers(event) && this.subs[event] ) {
            this._stopObserving(event);
            delete this.subs[event];
            if( this.isDynamic() && !this.hasObservers(util.keys(this.subs)) ) {
               this._unwatchDynamicSource();
            }
         }
      },

      _sendEvent: function(event, snap, prevChild) {
         if( event === 'value' ) {
            this.loadData(fn, this);
         }
         else if( !this.isJoinedChild() ) {
            // the snapshot may contain keys we don't want or they could reference dynamic paths
            // so the simplest solution here is to get the child path and load the data from there
            this.child(snap.name()).loadData(fn, this);
         }
         else if( this.hasKey(snap.name()) ) {
            // the hasKey here is critical because we only trigger events for children
            // which are part of our keyMap on the child records (the joined parent gets all, of course)
            fn.call(this, snap.val());
         }

         function fn(data) {
            if( data !== null || util.contains(['child_removed', 'value'], event) ) {
               log.debug('Path(%s)::sendEvent(%s, %s) to %d observers', this.name(), event, snap.name()+(prevChild !== undefined? '->'+prevChild : ''), this.getObservers(event).length, data);
               this.triggerEvent(event, this, event, snap.name(), data, prevChild, snap.getPriority());
            }
         }
      },

      isDynamic: function() {
         return !!this.props.dynamicSource;
      },

      isReadyForOps: function() {
         return !this.isDynamic() || !util.isEmpty(this.props.dynamicKey);
      },

      hasDynamicChild: function(sourceKey) {
         return util.has(this.dynamicChildPaths, sourceKey);
      },

      isReadOnly: function() {
         return this.props.readOnly;
      },

      _buildKeyMap: function(parent) {
         if( parent && !parent.isJoinedChild() ) {
            this.props.intersects = parent.isIntersection();
         }
         join.getKeyMapLoader(this, parent).done(function(readOnly, parsedKeyMap, dynamicChildPaths) {
            if( util.isEmpty(parsedKeyMap) ) {
               log.warn('Path(%s) contains an empty keyMap', this.name());
            }
            if( readOnly ) {
               log.info('Path(%s) no keyMap specified and could not find data at path "%s", this data is now read-only!', this.name(), this.toString());
            }
            this.props.readOnly = readOnly;
            this.props.keyMap = parsedKeyMap;
            this.dynamicChildPaths = dynamicChildPaths;
            this.observeOnce('dynamicKeyLoaded', function() {
               log.debug('Path(%s) finished keyMap: %j', this.toString(), this.getKeyMap());
               this.triggerEvent('keyMapLoaded', parsedKeyMap);
            }, this);
         }, this);
      },

      _parseRecordSet: function(parentSnap, callback, scope) {
         var out = {}, self = this;
         var q = util.createQueue();
         parentSnap.forEach(function(recSnap) {
            var aliasedKey = recSnap.name();
            out[aliasedKey] = null; // placeholder to enforce ordering
            q.addCriteria(function(cb) {
               self._parseRecord(recSnap, function(childData) {
                  if( childData === null ) {
                     delete out[aliasedKey];
                  }
                  else {
                     out[aliasedKey] = childData;
                  }
                  cb();
               })
            })
         });
         q.done(function() {
            if( util.isEmpty(out) ) { out = null; }
            log.debug('Path(%s) _parseRecordSet: %j', self.name(), out);
            callback.call(scope, out, parentSnap);
         });
      },

      _parseRecord: function(snap, callback, scope) {
         var out = null, q = util.createQueue();
         var data = snap.val();
         if( data !== null ) {
            if( this.isPrimitive() ) {
               out = data;
            }
            else {
               out = {};
               this.eachSourceKey(data, util.bind(this._parseValue, this, q, out, snap));
            }
         }
         q.done(function() {
            out = parseValue(out);
//            log('Path(%s) _parseRecord %s: %j', this.name(), snap.name(), out);
            callback.call(scope, out, snap);
         }, this);
         return callback;
      },

      _parseValue: function(queue, out, snap, sourceKey, aliasedKey, value) {
         if( value !== null ) {
            if( this.hasDynamicChild(sourceKey) ) {
               out[aliasedKey] = null; // placeholder for sorting
               out['.id:'+aliasedKey] = value;
               queue.addCriteria(function(cb) {
                  this._parseDynamicChild(snap, sourceKey, aliasedKey,
                     function(dynData) {
                        if( dynData === null ) {
                           delete out[aliasedKey];
                        }
                        else {
                           out[aliasedKey] = dynData;
                        }
                        cb();
                     });
               }, this);
            }
            else {
               out[aliasedKey] = value;
            }
         }
      },

      _parseDynamicChild: function(snap, sourceKey, aliasedKey, cb) {
         var sourceRef = snap.ref().child(sourceKey);
         var path = this.dynamicChildPaths[sourceKey].dynamicChild(sourceRef, aliasedKey);
         path.loadData(cb);
      },

      /**
       * @param data the data to be iterated
       * @param {Function} callback
       * @param {Object} [context]
       * @param {boolean} [useSourceKey] if true, this is inbound data for Firebase, otherwise, its snapshot data headed out
       * @private
       */
      _iterateKeys: function(data, callback, context, useSourceKey) {
         var args = util.Args('_iterateKeys', Array.prototype.slice.call(arguments), 2, 4).skip();
         callback = args.nextReq('function');
         context = args.next('object');
         useSourceKey = args.next('boolean');

         var map = this.getKeyMap();
         if( useSourceKey && map['.value'] ) {
            callback.call(context, '.value', map['.value'], data);
         }
         else {
            util.each(map, function(aliasedKey, sourceKey) {
               var val = getFirebaseValue(this, data, sourceKey, aliasedKey, useSourceKey);
               callback.call(context, sourceKey, aliasedKey, val);
            }, this);

            if( !useSourceKey ) {
               // At the record level, dynamic keys are converted into their own paths. While this greatly
               // simplifies the read process, writing the keys back into the data requires this additional
               // step to make sure they are added to my data before set() or update() is called
               util.each(this.props.dynamicAbstracts, function(aliasedKey, sourceKey) {
                  var dynKey = '.id:'+aliasedKey;
                  callback.call(context, sourceKey, aliasedKey, util.has(data, dynKey)? data[dynKey] : null, dynKey);
               });
            }
         }
      },

      _initDynamicSource: function() {
         if( this.isDynamic() ) {
            var ref = this.props.dynamicSource;
            ref.once('value', this._dynamicSourceEvent, function(err) {
               console.error('Could not access dynamic source path', ref.toString());
               this.abortObservers(err);
            }, this);
         }
         else {
            this.triggerEvent('dynamicKeyLoaded', undefined);
         }
      },

      _watchDynamicSource: function() {
         if( this.isDynamic() ) {
            var ref = this.props.dynamicSource;
            ref.on('value', this._dynamicSourceEvent, function(err) {
               console.error('Lost access to my dynamic source path', ref.toString());
               this.abortObservers(err);
            }, this);
         }
      },

      _unwatchDynamicSource: function() {
         if( this.isDynamic() ) {
            this.props.dynamicSource.off('value', this._dynamicSourceEvent, this);
         }
      },

      _dynamicSourceEvent: function(snap) {
         this._observeNewSourcePath(snap.val());
      },

      _observeNewSourcePath: function(pathKey) {
         if( pathKey !== this.props.dynamicKey ) {
            var oldPath = this.props.dynamicKey;
            var firstCall = oldPath === undefined;
            var events = util.keys(this.subs);
            util.each(events, this._stopObserving, this);
            firstCall || log('Path(%s) stopped observing dynamic key %s', this.name(), oldPath);
            this.props.dynamicKey = pathKey;
            if( pathKey !== null ) {
               assertValidFirebaseKey(pathKey);
               log('Path(%s) observing dynamic key %s', this.name(), pathKey);
               firstCall && this.triggerEvent('dynamicKeyLoaded', pathKey);
               util.each(events, this._startObserving, this);
            }
         }
      },

      _waitForReady: function(doneCallback, context) {
         this.observeOnce('dynamicKeyLoaded', function() {
            log.debug('Path(%s) loadData() dynamic key loaded, completing data load', this.name());
            if( this.isReadyForOps() ) {
               this.loadData(doneCallback, context);
            }
            else {
               log('Path(%s) has a dynamic key but the key was null. Returning null for value');
               doneCallback.call(context, null);
            }
         }, this);
      },

      _stopObserving: function(event) {
         this.ref(true).off(event, this.subs[event], this);
      },

      _startObserving: function(event) {
         this.subs[event] = util.bind(this._sendEvent, this, event);
         this.ref(true).on(event, this.subs[event], this.abortObservers, this);
      }
   };

   util.inherit(Path, util.Observable);

   /** UTILS
    ***************************************************/

   function buildPathProps(props, parent) {
      if( util.isFirebaseRef(props) || props instanceof join.JoinedRecord ) {
         props = { ref: props };
      }
      else {
         if( !props.ref ) {
            throw new Error('Must declare ref in properties hash for all Util.Join functions');
         }
         props = util.extend({}, props);
      }

      var out = util.extend({
         intersects: false,
         ref: null,
         keyMap: null,
         sortBy: false,
         pathName: null,
         dynamicSource: null,
         dynamicKey: undefined,
         dynamicAbstracts: {},
         sync: false,
         callback: function(path, event, snap, prevChild) {}
      }, props);

      if( util.isArray(out.keyMap) ) {
         out.keyMap = arrayToMap(out.keyMap);
      }

      out.pathName = (parent && !out.dynamicSource? refName(parent).replace(/\/$/, '')+'/' : '') + refName(out.ref);
      return out;
   }

   function refName(ref) {
      return (util.isFunction(ref, 'name') && ref.name()) || (util.isFunction(ref, 'ref') && ref.ref().name()) || '';
   }

   function arrayToMap(map) {
      var out = {};
      util.each(map, function(m) {
         out[m] = m;
      });
      return out;
   }

   function parseValue(data) {
      if( util.has(data, '.value') ) {
         data = data['.value'];
      }
      if( util.isEmpty(data) ) {
         data = null;
      }
      return data;
   }

   function getFirebaseValue(path, data, sourceKey, aliasedKey, useSourceKey) {
      var key = useSourceKey? sourceKey : aliasedKey;
      var val = null;
      if( !useSourceKey && path.hasDynamicChild(sourceKey) ) {
         var dynKey = '.id:'+aliasedKey;
         val = util.has(data, dynKey)? data[dynKey] : null;
      }
      else if( util.has(data, key) ) {
         val = data[key];
      }
      return val;
   }

   //todo move this to a util method on exports
   function assertValidFirebaseKey(key) {
      if( typeof(key) === 'number' ) { key = key +''; }
      if( typeof(key) !== 'string' || key.match(/[.#$\[\]]/) ) {
         throw new Error('Invalid path in dynamic key, must be non-empty and cannot contain ".", "#", "$", "[" or "]"');
      }
   }

   join.Path = Path;

})(fb);
(function (exports, fb) {
   "use strict";
   var util = fb.pkg('util');
   var join = fb.pkg('join');
   var log  = fb.pkg('log');

   /**
    * @param {Array} rawPathData
    * @constructor
    */
   function PathLoader(rawPathData) {
      var childKey;
      this._assertValidPaths(rawPathData);
      this.finalPaths = [];

      if( isChildPathArgs(rawPathData) ) {
         // occurs when loading child paths from a JoinedRecord, which
         // passes the parent JoinedRecord (paths[0]) and a key name (paths[1])
         this.joinedParent = rawPathData[1];
         this.refName = rawPathData[0];
         this.rootRef = this.joinedParent.rootRef;
         childKey = this.refName;
         // when we load a child of a child, it's not possible to determine which
         // branch the child comes off of until after the parent loads its keys
         // so we do a little dance magic here to determine which parent it comes from
         if( this.joinedParent.joinedParent ){
            this.queue = this._loadDeepChild(childKey);
         }
         else {
            this.queue = this._loadRecord(childKey);
         }
      }
      else {
         this.finalPaths = buildPaths(rawPathData);
         this.refName = makeMasterName(this.finalPaths);
         this.rootRef = this.finalPaths[0].ref().root();
         this.queue = util.createQueue(pathCallbacks(this.finalPaths));
      }

      this.queue
         .done(function() {
            this.intersections = intersections(this.finalPaths);
            this.sortPath = findSortPath(this.finalPaths, this.intersections);
            enforceSingleSortPath(this.finalPaths, this.sortPath);
            this._assertSortPath();
            reconcilePathKeys(this.finalPaths);
         }, this)
         .fail(function() {
            util.each(Array.prototype.slice.call(arguments), function(e) {
               log.error(e);
            })
         });
   }

   PathLoader.prototype = {

      _assertValidPaths: function(paths) {
         if( !paths || !paths.length ) {
            throw new Error('Cannot construct a JoinedRecord without at least 1 path');
         }
         if( !isChildPathArgs(paths) ) {
            util.each(paths, this._assertValidPath, this);
         }
      },

      _assertValidPath: function(p, i) {
         if( !isValidRef(p) ) {
            if( !util.isObject(p) || !isValidRef(p.ref) ) {
               throw new Error(util.printf('Invalid path at position %d; it must be a valid Firebase or JoinedRecord instance, or if a props object is used, contain a ref key which is a valid instance', i));
            }
         }
      },

      _assertSortPath: function() {
         if( !this.sortPath ) {
            throw new Error('Did not set a sort path. Should not be able to create this condition');
         }
         if( !util.isEmpty(this.intersections) && !this.sortPath.isIntersection() ) {
            throw new Error(util.printf('Sort path cannot be set to a non-intersecting path as this makes no sense', this.name()));
         }
      },

      _loadDeepChild: function(childKey) {
         return util.createQueue()
            .addCriteria(function(cb) {
               this.joinedParent.queue.done(function() {
                  var parentPath = searchForParent(this.joinedParent.paths, childKey);
                  if( parentPath.isDynamic() ) {
                     this.finalPaths.push(new join.Path({
                        ref: parentPath.ref(true)||parentPath.props.ref.push(),
                        keyMap: {'.value': '.value'}
                     }, parentPath));
                  }
                  else {
                     this.finalPaths.push(parentPath.child(childKey));
                  }

                  cb();
               }, this).fail(cb);
            }, this);
      },

      _loadRecord: function(childKey) {
         var q = util.createQueue();
         var finalPaths = this.finalPaths;
         var joinedParent = this.joinedParent;
         q.addCriteria(function(cb) {
            joinedParent.queue.done(function() {
               util.each(joinedParent.paths, function(parentPath) {
                  var childPath = parentPath.child(childKey);
                  finalPaths.push(childPath);
                  // at the record level, we convert dynamic paths into normal join paths
                  // to greatly simplify the read and merge process, this is done by removing
                  // the dynamic key from the child path and converting it into its own fully
                  // functional path object
                  util.each(parentPath.getDynamicPaths(), function(path, key) {
                     // we then need to suppress the key in the child so it doesn't also try to include this data
                     finalPaths.push(path.dynamicChild(childPath.ref().child(key), parentPath.aliasedKey(key)));
                     childPath.suppressDynamicKey(key);
                  })
               });
               util.createQueue(pathCallbacks(finalPaths)).done(cb);
            }).fail(cb);
         }, this);
         return q;
      }
   };

   function buildPaths(paths) {
      return util.map(paths, function(props) {
         return props instanceof join.Path? props : new join.Path(props);
      })
   }

   function searchForParent(paths, childKey) {
      return util.find(paths, function(p) { return p.hasKey(childKey); }) || findSortPath(paths, intersections(paths));
   }

   function findSortPath(paths, intersections) {
      return util.find(paths, function(p) { return p.isSortBy(); })
         || (util.isEmpty(intersections)? paths[0] : intersections[0]);
   }

   function enforceSingleSortPath(paths, sortPath) {
      if( sortPath ) {
         sortPath.setSortBy(true);
         log.debug('Path(%s) is the sort path for this join', sortPath.name());
         util.each(paths, function(p) {
            if(p.isSortBy() && !p.equals(sortPath)) {
               log.warn('Multiple sort paths found. Ignoring Path(%s)', p.name());
               p.setSortBy(false);
            }
         });
      }
   }

   function intersections(paths) {
      return util.filter(paths, function(p) { return p.isIntersection() });
   }

   /**
    * Wrap paths in a callback that can be invoked by Queue
    */
   function pathCallbacks(paths) {
      return util.map(paths, function(path) {
         return function(cb) {
            path.observeOnce('keyMapLoaded', cb.bind(null, null));
         }
      });
   }

   /**
    * The idea here is that key conflicts have to be resolved. The method we've picked for this
    * is that the last path wins. Basically, each additional path "extends" the prior one jQuery style.
    *
    * Now this method prevents the need for every point where we merge or reconcile data to look through
    * every path to see which ones have the key, and which one should win if more than one contains it.
    *
    * Instead, we just remove them directly from the paths when they load.
    *
    * @param paths
    */
   function reconcilePathKeys(paths) {
      var foundKeys = {};
      util.each(paths.slice(0).reverse(), function(path) {
         util.each(path.getKeyMap(), function(toKey, fromKey) {
            if( util.has(foundKeys, toKey) ) {
               path.removeConflictingKey(fromKey, foundKeys[toKey]);
            }
            else {
               foundKeys[toKey] = path;
            }
         });
      });
   }

   function makeMasterName(paths) {
      var names = util.map(paths, function(p) { return p.ref().name(); });
      return names.length > 1? '['+names.join('][')+']' : names[0];
   }

   function isValidRef(ref) {
      return util.isFirebaseRef(ref) || ref instanceof join.JoinedRecord || ref instanceof join.Path;
   }

   function isChildPathArgs(args) {
      return args && args.length === 2 && typeof(args[0]) === 'string' && args[1] instanceof join.JoinedRecord;
   }

   join.PathLoader = PathLoader;

})(exports, fb);
(function(exports, fb) {
   var undefined;
   var util = fb.pkg('util');
   var log  = fb.pkg('log');
   var join = fb.pkg('join');

   /**
    * Builds snapshots by calling once('value', ...) against each path. Paths are resolved iteratively so
    * that dynamic paths can be loaded once enough data is present for their needs. All data is applied
    * in the order the paths were declared (not in the order they return from Firebase) ensuring merging
    * looks correct.
    *
    * Use this by calling fb.pkg('join').buildSnapshot(...).
    *
    * @param {JoinedRecord} rec
    * @constructor
    */
   function SnapshotBuilder(rec) {
      this.rec = rec;
      this.observers = [];
      this.valueParts = [];
      this.callbacksExpected = 0;
      this.callbacksReceived = 0;
      this.state = 'unloaded';
      this.snapshot = null;
      this.pendingPaths = groupPaths(rec.paths, rec.sortPath);
   }

   SnapshotBuilder.prototype = {
      /**
       * @param {Function} callback
       * @param [context]
       */
      value: function(callback, context) {
         this.observers.push(util.toArray(arguments));
         //todo use util.createQueue?
         if( this.state === 'loaded' ) {
            this._notify();
         }
         else if( this.state === 'unloaded' ) {
            this._process();
         }
         return this;
      },

      ref: function() {
         return this.rec;
      },

      _process: function() {
         this.state = 'processing';

         // load all intersecting paths and then all unions
         util.each(this.pendingPaths.intersects, this._loadIntersection, this);

         // and then all unions
         util.each(this.pendingPaths.unions, this._loadUnion, this);
      },

      _finalize: function() {
         // should only be called exactly once
         if( this.state !== 'loaded' ) {
            this.state = 'loaded';
            var dat = null;
            if( !this.rec.joinedParent && this.pendingPaths.intersects.length ) {
               dat = mergeIntersections(this.pendingPaths, this.valueParts);
            }
            else {
               dat = mergeValue(this.pendingPaths, this.valueParts);
            }
            this.snapshot = new join.JoinedSnapshot(this.rec, dat);
            log.debug('SnapshotBuilder: Finalized snapshot "%s": %j', this.rec, this.snapshot.val());
            this._notify();
         }
      },

      _notify: function() {
         var snapshot = this.snapshot;
         util.each(this.observers, function(obsArgs) {
            obsArgs[0].apply(obsArgs[1], [snapshot].concat(obsArgs.splice(2)));
         });
         this.observers = [];
      },

      _loadIntersection: function(parts) {
         var path = parts[0];
         var myIndex = parts[1];
         this.callbacksExpected++;
         log.debug('SnapshotBuilder._loadIntersection: initialized "%s"', path.toString());
         path.loadData(function(data) {
            log.debug('SnapshotBuilder._loadIntersection completed "%s" with value "%j"', path.toString(), data);
            if( data === null ) {
               log('SnapshatBuilder: Intersecting Path(%s) was null, so the record %s will be excluded', path.toString(), this.rec.name());
               // all intersected values must be present or the total value is null
               // so we can abort the load here and send out notifications
               this.valueParts = [];
               this._finalize();
            }
            else {
               this.valueParts[myIndex] = data;
               //todo remove this defer when test units are done?
               this._callbackCompleted();
            }
         }, this);
      },

      _loadUnion: function(parts) {
         var path = parts[0];
         var myIndex = parts[1];
         this.callbacksExpected++;
         log.debug('SnapshotBuilder._loadUnion: initialized "%s"', path.toString());
         path.loadData(function(data) {
            log.debug('SnapshotBuilder._loadUnion completed "%s" with value "%j"', path.toString(), data);
            this.valueParts[myIndex] = data;
            this._callbackCompleted();
         }, this);
      },

      _callbackCompleted: function() {
         if( this.callbacksExpected === ++this.callbacksReceived) {
            // so it's time to call this mission completed
            this._finalize();
         }
      }
   };

   function mergeIntersections(paths, valueParts) {
      var ikeys = util.map(paths.intersects, function(parts) { return parts[1]; });
      var out = {};
      util.each(valueParts[paths.sortIndex], function(v, k) {
         if( noEmptyIntersections(ikeys, valueParts, k) ) {
            var parts = util.map(valueParts, function(part) {
               return util.isObject(part)? part[k] : null;
            });
            out[k] = mergeValue(paths, parts);
         }
      });
      return util.isEmpty(out)? null : out;
   }

   function noEmptyIntersections(intersectKeys, valueParts, recordKey) {
      return !util.contains(intersectKeys, function(key) {
         return !util.isObject(valueParts[key]) || util.isEmpty(valueParts[key][recordKey]);
      });
   }

   function mergeValue(paths, valueParts) {
      var out = {};
      util.each(valueParts, function(v, i) {
         if( v !== null ) {
            var myPath = paths.both[i][0];
            if( myPath.isPrimitive() ) {
               util.extend(out, makeObj(myPath.aliasedKey('.value'), v));
            }
            else {
               util.extend(true, out, v);
            }
            if( myPath.isDynamic() ) {
               util.extend(out, makeObj('.id:'+myPath.aliasedKey('.value'), myPath.props.dynamicKey));
            }
         }
      });
      return util.isEmpty(out)? null : out;
   }

   function groupPaths(paths, sortPath) {
      var out = { intersects: [], unions: [], both: [], expect: 0, sortIndex: 0 };
      util.each(paths, function(path) {
         pathParts(out, sortPath, path);
      });
      return out;
   }

   function pathParts(pendingPaths, sortPath, path) {
      if( path === sortPath ) {
         pendingPaths.sortIndex = pendingPaths.expect;
      }

      var parts = [path, pendingPaths.expect];
      if( path.isIntersection() ) { pendingPaths.intersects.push(parts); }
      else { pendingPaths.unions.push(parts); }
      pendingPaths.both.push(parts);

      pendingPaths.expect++;
   }

   function makeObj(key, val) {
      var out = {};
      out[key] = val;
      return out;
   }

   /**
    * Any additional args passed to this method will be returned to the callback, after the snapshot, upon completion
    * @param rec
    * @param [callback]
    * @param [context]
    */
   join.buildSnapshot = function(rec, callback, context) {
      var snap = new SnapshotBuilder(rec);
      if( callback ) {
         snap.value.apply(snap, util.toArray(arguments).slice(1));
      }
      return snap;
   };

   /**
    * @param {JoinedRecord} rec
    * @param data
    * @param {JoinedSnapshot} [childSnap]
    * @returns {*}
    */
   join.sortSnapshotData = function(rec, data, childSnap) {
      var out = data;
      if( !util.isEmpty(data) ) {
         if( rec.joinedParent ) {
            out = {};
            util.each(rec.paths, function(path) {
               path.eachKey(data, function(sourceKey, aliasedKey, value) {
                  if( value === null ) { return; }
                  if( path.hasDynamicChild(sourceKey) ) {
                     out['.id:'+aliasedKey] = value;
                     out[aliasedKey] = data[aliasedKey];
                  }
                  else {
                     out[aliasedKey] = value;
                  }
               });
            });
         }
         else {
            out = {};
            util.each(rec.sortedChildKeys, function(key) {
               if( childSnap && childSnap.name() === key ) {
                  util.isEmpty(childSnap.val()) || (out[key] = childSnap.val());
               }
               else if( !util.isEmpty(data[key]) ) {
                  out[key] = data[key];
               }
            });
         }
      }
      return util.isEmpty(out)? null : out;
   };
})(exports, fb);
(function(exports, fb) {
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   /**
    * Sync to multiple Firebase paths and seamlessly merge the data into a single object.
    * An instance of this class should work if passed as a ref into angularFire objects.
    *
    * Accepts any number of {Firebase|Object} arguments, see README for details.
    * @param {...Object} refs
    * @static
    */
   exports.join = function(refs) {
      return buildJoinedRecord(Array.prototype.slice.call(arguments), function(props) {
         util.has(props, 'intersects') || (props.intersects = false);
         return props;
      });
   };

   /**
    * This is the intersection of the two or more paths (an INNER JOIN), so that only
    * records existing in all paths provided are returned.
    *
    * Accepts any number of {Firebase|Object} arguments, see README for details.
    * @param {...Object} refs
    * @static
    */
   exports.intersection = function(refs) {
      return buildJoinedRecord(Array.prototype.slice.call(arguments), function(props) {
         util.has(props, 'intersects') || (props.intersects = true);
         return props;
      });
   };

   exports.JoinedRecord = join.JoinedRecord;

   function buildJoinedRecord(args, factory) {
      if( args.length === 1 && util.isArray(args[0]) ) { args = args[0]; }
      var paths = util.map(args, function(pathProps, i) {
         if( !util.isObject(pathProps) ) {
            throw new Error('Invalid argument at pos %s, must be a Firebase, JoinedRecord, or hash of properties', i);
         }
         else if( util.isFirebaseRef(pathProps) || pathProps instanceof join.JoinedRecord ) {
            pathProps = { ref: pathProps };
         }
         return factory(pathProps);
      });
      return util.construct(join.JoinedRecord, paths);
   }
})(exports, fb);

})( typeof window !== "undefined"? [window.Firebase.util = {}][0] : module.exports );
