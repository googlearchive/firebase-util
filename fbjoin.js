/*! FirebaseJoin - v0.0.0 - 2013-10-09
* https://github.com/katowulf/FirebaseJoin
* Copyright (c) 2013 Michael "Kato" Wulf
* MIT LICENSE */

(function(exports) {
   "use strict";

/**
 * Sync to multiple Firebase paths and seamlessly merge the data into a single object.
 * An instance of this class should work if passed as a ref into angularFire objects.
 *
 * This class can accept paths that store primitives, objects, or arrays
 * Primitive values are stored using the path's parent name. For example:
 * <pre><code>
 *    // given this data
 *    {
 *       car/123: "Ford GT",
 *       truck/123: "Ford F150"
 *    }
 *
 *    // and this join
 *    new FirebaseJoin( new Firebase('INSTANCE/car'), new Firebase('INSTANCE/truck') );
 *
 *    // the joined object would look as follows:
 *    { car: "Ford GT", truck: "Ford F150" }
 * </code></pre>
 *
 * Conflicting paths can be resolved by adding a dataKey, to specify which field the primitive value should
 * be stored in (see below).
 *
 * The `paths` elements are either a Firebase ref, a function, or a hash with the following structure:
 * <ul>
 *    <li>{Firebase|Function} ref: (required!) ref to the parent path for this set of records</li>
 *    <li>{boolean}    intersects: defaults to false, if true the join will only contain records that exist in this path</li>
 *    <li>{string}        dataKey: specify the data key if this path contains primitive values</li>
 *    <li>{boolean}        sortBy: sort records by this path's ordering
 * </ul>
 *
 * To include records from a path which are not keyed by the same ID, a mapping function can be provided in place
 * of the Firebase ref. It will be passed a record from any intersecting path (whichever returns first) and
 * determines how to look up the secondary records. Note that at least one path must exist which is not mapped.
 *
 * The mapping function's signature: function(recordId, parentName, snapshot) { ...returns Firebase ref to child... }
 *
 * Example:
 * <pre><code>
 *
 *    // given this data structure:
 *    {
 *       account: {
 *          kato: {
 *              email: "wulf@firebase.com",
 *              member_since: "2013"
 *          }
 *       },
 *
 *       profile: {
 *          "kato": {
 *              name: "Michael Wulf",
 *              nick: "Kato",
 *              style: "Kung Fu"
 *          }
 *       },
 *
 *       styles: {
 *           "Kung Fu": {
 *              description: "Chinese system based on physical exercises involving animal mimicry"
 *           }
 *       }
 *    }
 *
 *
 *    // we could use this join:
 *    new FirebaseJoin(
 *        new Firebase('INSTANCE/account'),
 *        new Firebase('INSTANCE/profile'),
 *        function(recordId, parentName, snapshot) {
 *          if( parentName === 'profile' ) {
 *             var style = snapshot.val().style;
 *             return new Firebase('INSTANCE/styles/'+style+'/description');
 *          }
 *          else {
 *             // wait for the profile to load
 *             return undefined;
 *          }
 *        }
 *    );
 * </code></pre>
 *
 * @param {Firebase|Object} paths any number of Firebase instances or hash objects!
 */
function FirebaseJoin(paths) {}

FirebaseJoin.prototype = {
   /**
    * If a string, this is the field on each record to use as a comparator (be sure to account for nulls!)
    *
    * If a function, the signature is an array, containing a ??snapshot?? for each child ref, and the function
    * should return a string or integer for comparison.
    *
    * @param {string|Function} fieldOrFunction
    */
   sortOrder: function(fieldOrFunction) {},

   /**
    * Force records to obey the ordering provided in this ref's data.
    *
    * @param {Firebase} pathRef
    */
   sortPath: function(pathRef) {},

   auth:            function() {}, // wrap
   unauth:          function() {}, // wrap
   on:              function() {}, //todo value? moved?
   off:             function() {},
   once:            function() {},
   child:           function() {}, // returns MergedChild instance
   set:             function() {}, //todo?
   setWithPriority: function() {}, //todo?
   setPriority:     function() {}, //todo?
   update:          function() {}, // throws error if primitive? iterates children and calls set on each MergedChild instance
   remove:          function() {},
   parent:          function() {}, //todo throw Error? return first ref's parent?
   name:            function() {}, //todo is this proprietary? the first ref's name()?
   limit:           function() {}, //todo throw Error?
   endAt:           function() {}, //todo throw Error?
   startAt:         function() {}, //todo throw Error?
   push:            function() {},
   root:            function() {},
   toString:        function() {},
   transaction:     function() {}, //todo???
   onDisconnect:    function() {}  //todo?
};




function Snapshot() {}
Snapshot.prototype = {
   val:         function() {}, //todo
   child:       function() {}, //todo
   forEach:     function() {}, //todo
   hasChild:    function() {}, //todo
   hasChildren: function() {}, //todo
   name:        function() {}, //todo
   numChildren: function() {}, //todo
   ref:         function() {}, //todo
   getPriority: function() {}, //todo
   exportVal:   function() {}  //todo
};

function MergedChild() {}
MergedChild.prototype = {
   on:              function() {},
   off:             function() {},
   once:            function() {},
   child:           function() {}, // returns a normal Firebase ref to child path
   parent:          function() {}, // returns the FirebaseJoin instance
   name:            function() {},
   set:             function() {}, // splits merged data and calls set on each record
   setWithPriority: function() {}, //todo?
   setPriority:     function() {}, //todo?
   update:          function() {}, // splits merged data adn calls update on each record
   remove:          function() {},
   limit:           function() {}, //todo throw Error?
   endAt:           function() {}, //todo throw Error?
   startAt:         function() {}, //todo throw Error?
   push:            function() {}, //todo throw error?
   root:            function() {},
   toString:        function() {},
   transaction:     function() {},
   onDisconnect:    function() {}  //todo?
};
/**
 * This returns the union of two or more paths (an OUTER JOIN).
 *
 * For example, given this data
 * <pre><code>
 *    {
 *       fruit: {
 *          "a": "apple",
 *          "b": "banana"
 *       }
 *       legume: {
 *          "b": "baked beans"
 *          "c": "chickpeas",
 *          "d": "dry-roasted peanuts"
 *       }
 *       veggie: {
 *          "b": "broccoli",
 *          "d": "daikon raddish",
 *          "e": "elephant garlic"
 *       }
 *    }
 * </code></pre>
 *
 * Calling union with an array:
 * `FirebaseJoin.union([new Firebase('INSTANCE/fruit'), new Firebase('INSTANCE/legume'), new Firebase('INSTANCE/veggie')]);`
 *
 * Produces this:
 * <pre><code>
 *   {
 *      a: { fruit: "apple" },
 *      b: { fruit:  "bannana", legume: "baked beans", veggie: "broccoli" },
 *      c: { legume: "chickpeas" },
 *      d: { legume: "dry-roasted peanuts", veggie: "daikon raddish" },
 *      e: { veggie: "elephant garlic" }
 *   }
 * </code></pre>
 *
 * @param {Array} paths
 * @static
 */
FirebaseJoin.union = function(paths) {};

/**
 * This returns the union of two or more paths, but only if the record exists in basePath (a LEFT OUTER JOIN).
 *
 * For example, given this data
 * <pre><code>
 *    {
 *       fruit: {
 *          "a": "apple",
 *          "b": "banana"
 *       }
 *       legume: {
 *          "b": "baked beans"
 *          "c": "chickpeas",
 *          "d": "dry-roasted peanuts"
 *       }
 *       veggie: {
 *          "b": "broccoli",
 *          "d": "daikon raddish",
 *          "e": "elephant garlic"
 *       }
 *    }
 * </code></pre>
 *
 * Calling unionLeft with a base path of fruit:
 * `FirebaseJoin.union(new Firebase('INSTANCE/fruit'), [new Firebase('INSTANCE/legume'), new Firebase('INSTANCE/veggie')]);`
 *
 * Produces: this:
 * <pre><code>
 *   {
 *      a: { fruit: "apple" },
 *      b: { fruit:  "bannana", legume: "baked beans", veggie: "broccoli" }
 *   }
 * </code></pre>
 *
 * @param {Firebase} [basePath] essentially an index; makes this a LEFT OUTER JOIN
 * @param {Array} paths
 * @static
 */
FirebaseJoin.unionLeft = function(basePath, paths) {};

/**
 * This is the intersection of the two or more paths (an INNER JOIN), so that only
 * records existing in all paths provided are returned.
 *
 * For example, given this data
 * <pre><code>
 *    {
 *       fruit: {
 *          "a": "apple",
 *          "b": "banana"
 *       }
 *       legume: {
 *          "b": "baked beans"
 *          "c": "chickpeas",
 *          "d": "dry-roasted peanuts"
 *       }
 *       veggie: {
 *          "b": "broccoli",
 *          "d": "daikon raddish",
 *          "e": "elephant garlic"
 *       }
 *    }
 * </code></pre>
 *
 * Calling intersection with an array:
 * `FirebaseJoin.union([new Firebase('INSTANCE/fruit'), new Firebase('INSTANCE/legume'), new Firebase('INSTANCE/veggie')]);`
 *
 * Produces this:
 * <pre><code>
 *   {
 *      b: { fruit:  "bannana", legume: "baked beans", veggie: "broccoli" },
 *   }
 * </code></pre>
 *
 * @param {Array} paths
 * @static
 */
FirebaseJoin.intersection = function(paths) {};

   exports.FirebaseJoin = FirebaseJoin;

})( typeof(exports) === "undefined" || !exports? window : exports );
