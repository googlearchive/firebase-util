var URL = process.env.FIREBASE_TEST_URL;
var SECRET = process.env.FIREBASE_TEST_SECRET;

if( !URL || !SECRET ) {
   throw new Error('Please declare environment variables FIREBASE_TEST_URL and FIREBASE_TEST_SECRET before invoking test units.');
}

var JQDeferred = require('JQDeferred');
var request = require('request');
var Firebase = require('firebase');
var FB = new Firebase(URL);
var TokGen = new (require('firebase-token-generator'))(SECRET);

var fb = require('../../firebase-utils.js')._ForTestingOnly;
var helpers = exports;

/**
 * Set a value on a Firebase path
 *
 * @param {Array|String} path (arrays joined joined with /)
 * @param {*} data
 * @returns {JQDeferred}
 */
helpers.set = function(path, data) {
   return JQDeferred(function(def) {
      helpers.ref(path).set(data, function() {
         helpers.handle(def)();
      });
   })
};

/**
 * Get a value from a Firebase path
 *
 * @param {Array|String} path (arrays joined joined with /)
 * @returns {JQDeferred} resolves to the value
 */
helpers.get = function(path) {
   return JQDeferred(function(def) {
      helpers.ref(path).once('value', function(snap) {
         def.resolve(snap.val());
      }, def.reject);
   });
};

/**
 * Remove value at a path
 * @param {Array|String} path (arrays joined joined with /)
 */
helpers.remove = function(path) {
   return JQDeferred(function(def) {
      helpers.ref(path).remove(helpers.handle(def))
   });
};

/**
 * Set a priority at a given path
 * @param {Array|String} path (arrays joined joined with /)
 * @param {String|number} newPri
 */
helpers.setPriority = function(path, newPri) {
   return JQDeferred(function(def) {
      helpers.ref(path).setPriority(newPri, function(err) {
         def.resolve();
      })
   });
};

/**
 * Create a Firebase  ref
 *
 * @param {Array|String} path (arrays joined joined with /)
 * @returns {Firebase}
 */
helpers.ref = function(path) {
   return fb.util.isEmpty(path)? FB : FB.child(fb.util.isArray(path)? path.join('/') : path);
};

/**
 * Log in using Firebase secret (as a super)
 *
 * @param {Array|String} path (arrays joined joined with /)
 * @returns {JQDeferred}
 */
helpers.sup = function(path) {
   return JQDeferred(function(def) {
      var ref = helpers.ref(path);
      ref.auth(SECRET, helpers.handle(def, ref));
   });
};

/**
 * Reset all Firebase data and log in as super
 * @param {Object} json data to load into Firebase instance
 * @param {Function} [done] optionally call this method when finished
 */
helpers.reset = function(json, done) {
   return helpers.chain().sup().set(null, json).unauth().testDone(done||function(err) { err && fb.log.error(err); });
};

/**
 * Handle a standard node.js callback (error first) and resolve on completion. Any additional arguments
 * passed to this method are passed into resolve on success.
 *
 * @param {JQDeferred} deferred
 * @returns {Function}
 */
helpers.handle = function(deferred) {
   var args = Array.prototype.slice.call(arguments, 1);
   return function(err) {
      var cbargs = Array.prototype.slice.call(arguments, 1);
      if( err ) { console.error(err); deferred.reject(err); }
      else { deferred.resolve.apply(deferred, args.concat(cbargs)); }
   }
};

/**
 * Authenticate to Firebase by creating a token in the format { id: user }. The
 * auth is revoked after this test case completes.
 *
 * @param {String} user
 * @param {Array|String} path (arrays joined joined with /)
 * @returns {JQDeferred}
 */
helpers.auth = function(user, path) {
   return JQDeferred(function(def) {
      doAfterTest(helpers.unauth, helpers);
      var ref = helpers.ref(path);
      ref.auth( helpers.tok(user), helpers.handle(def, ref) );
   });
};

/**
 * Calls Firebase.unauth()
 */
helpers.unauth = function() {
   helpers.ref().unauth();
};

/**
 * Creates a Firebase auth token (usually just call helpers.auth())
 * @param {String} user
 * @returns {String} the token
 */
helpers.tok = function(user) {
   return TokGen.createToken({id: user});
};

/**
 * Send a REST API call and get the response
 */
helpers.rest = function(path, method, data) {
   return JQDeferred(function(def) {
      var out = {
         uri: buildUrl(path),
         method: method||'GET'
      };
      if( data ) { out.data = data }

      request(out, handleResponse);

      function handleResponse(error, response, body) {
         if( error || response.statusCode !== 200 ) {
            console.error(error);
            def.reject(error || new Error((body && body.error) || 'bad status code '+response.statusCode));
         }
         else {
            def.resolve(response.statusCode, body);
         }
      }
   });
};

/**
 * Turns on fb.log reporting until the test unit completes (automagically reverted to what it was before the test).
 * The log level defaults to 'log'
 *
 * @param {String|int} [level]
 * @param {String|RegExp} [grep]
 */
helpers.debugThisTest = function(level, grep) {
   doAfterTest(fb.log.logLevel(level||'log', grep));
};

/**
 * Turns off a Firebase or JoinedRecord reference after test finishes, regardless of whether it
 * fails or succeeds. (Can be called on anything with an off() function)
 */
helpers.turnOffAfterTest = function(ref) {
   doAfterTest(fb.util.bind(ref.off, ref));
   return ref;
};

/**
 * Wait a certain length before invoking optional callback.
 * @param {Function} [callback]
 * @param {int} [milliseconds] (defaults to 0)
 */
helpers.wait = function(callback, milliseconds) {
   if( typeof(callback) === 'number' ) {
      milliseconds = callback;
      callback = null;
   }
   return JQDeferred(function(def) {
      setTimeout(function() {
         if( callback ) {
            try {
               def.resolve(callback());
            }
            catch(e) {
               def.reject(e);
            }
         }
         else {
            def.resolve();
         }
      }, milliseconds||0);
   })
};

/**
 * A wrapper on wait() that defaults to a short pause rather than 0
 * @param callback
 */
helpers.pause = function(callback) {
   return helpers.wait(callback, 250);
};

/**
 * Returns a jquery deferred promise and invokes the callback, passing in the
 * deferred object for resolve/reject. (mainly useful for chaining)
 * @param {Function} callback
 */
helpers.def = function(callback) {
   return JQDeferred(callback).promise();
};

/**
 * Makes all helpers methods return promise objects and allows them to be chained
 * (guaranteed to run in order). Also adds a special testDone() method to the chain
 * which can be called with mocha's async done() function to handle it's invocation
 * based on whether the chain succeeds or fails.
 *
 * Example:
 * <pre><code>
 *    helpers.chain()
 *       // log in as super user
 *       .sup()
 *       // remove widgets
 *       .set('widgets', null)
 *       // log in as 'test-user'
 *       .auth('test-user')
 *       // set the widgets as test-user
 *       .set('widgets', {hello: 'world'})
 *       // fetch the value of test widgets
 *       .get('widgets')
 *       // check the value we fetched
 *       .then(function(v) {
 *          console.log('widgets', v);
 *       })
 *       // finish the test
 *       .testDone(done);
 * </code></pre>
 *
 * @returns {JQDeferred} with all methods from helpers as deferrable calls
 */
helpers.chain = function() {
   var def = arguments[0] || JQDeferred().resolve();
   for(var key in helpers) {
      if( helpers.hasOwnProperty(key) ) {
         def[key] = wrapFn(def, helpers[key]);
      }
   }
   def.testDone = function(done) {
      // if done is passed any arguments, other than an Error, it will freak
      // so wrap the success callback
      return def.fail(done).done(function() { done(); });
   };
   var _then = def.then;
   def.then = function(successFn, errorFn) {
      return helpers.chain(_then.call(def, successFn, errorFn));
   };
   return def;
};

function argsAsArray(argThing) {
   return Array.prototype.slice.call(argThing, 0);
}

function wrapFn(chain, fn) {
   return function() {
      var origArgs = argsAsArray(arguments);
      return helpers.chain(chain.then(function() {
         return JQDeferred.when(fn.apply(null, origArgs));
      }));
   }
}

function buildUrl(path) {
   var p = URL;
   if( !p.match(/\/$/) ) {
      p += '/';
   }
   return p + path + '.json?auth='+SECRET;
}

var doAfterTest = (function(util) {
   var subs = [];
   afterEach(function() {
      util.call(subs);
      subs = [];
   });

   return function(fn, context) {
      subs.push(util.bind.apply(null, util.toArray(arguments)));
   }
})(fb.util);