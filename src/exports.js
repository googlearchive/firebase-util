
/**
 * Sync to multiple Firebase paths and seamlessly merge the data into a single object.
 * An instance of this class should work if passed as a ref into angularFire objects.
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
 *    FirebaseUtil.join(
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
 * Accepts any number of {Firebase|Object|Function} arguments, see README for details.
 */
exports.join = function() {};

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
 * `FirebaseUtil.union(new Firebase('INSTANCE/fruit'), new Firebase('INSTANCE/legume'), new Firebase('INSTANCE/veggie'));`
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
 * Accepts any number of {Firebase|Object|Function} arguments, see README for details.
 * @static
 */
exports.union = function() {};

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
 * `FirebaseUtil.intersection(
 *     new Firebase('INSTANCE/fruit'),
 *     new Firebase('INSTANCE/legume'),
 *     new Firebase('INSTANCE/veggie')
 *  );`
 *
 * Produces this:
 * <pre><code>
 *   {
 *      b: { fruit:  "bannana", legume: "baked beans", veggie: "broccoli" },
 *   }
 * </code></pre>
 *
 * Accepts any number of {Firebase|Object|Function} arguments, see README for details.
 * @static
 */
exports.intersection = function() {};