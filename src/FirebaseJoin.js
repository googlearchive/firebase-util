/**
 * Sync to multiple Firebase paths and seamlessly merge the data into a single object.
 * An instance of this class should work if passed as a ref into angularFire objects.
 *
 * ASSUMPTIONS: Each path provided to the join contains data in a standard structure
 * (objects will not contain varying depths and child keys)
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


