
var startedAt = new Date().getTime();
var JQDeferred = require('JQDeferred');
var Firebase = require('firebase');
var URL = process.env.FIREBASE_TEST_URL;
var SECRET = process.env.FIREBASE_TEST_SECRET;
var fb = require('../../firebase-utils.js')._ForTestingOnly;
var TokGen = new (require('firebase-token-generator'))(SECRET);
if( !URL || !SECRET ) {
   throw new Error('Please declare environment variables FIREBASE_TEST_URL and FIREBASE_TEST_SECRET before invoking test units.');
}
var FB = new Firebase(URL);

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
      helpers.ref(path).set(data, helpers.handle(def));
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
 * Create a Firebase  ref
 *
 * @param {Array|String} path (arrays joined joined with /)
 * @returns {Firebase}
 */
helpers.ref = function(path) {
   return path? FB.child(typeof(path)==='string'? path : path.join('/')) : FB;
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
      if( err ) { deferred.reject(err); }
      else { deferred.resolve.apply(deferred, args.concat(cbargs)); }
   }
};

/**
 * Authenticate to Firebase by creating a token in the format { id: user }
 *
 * @param {String} user
 * @param {Array|String} path (arrays joined joined with /)
 * @returns {JQDeferred}
 */
helpers.auth = function(user, path) {
   return JQDeferred(function(def) {
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
 * Turns on all debugging until the test unit completes. Returns a new done() function
 * for you to call after finishing.
 * @param [level]
 */
helpers.debugThisTest = function(level) {
   revertLogging = fb.log.logLevel(level||'debug');
};
var revertLogging;

afterEach(function() {
   revertLogging && revertLogging();
});

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
      def.then(function() { done(); }, done);
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