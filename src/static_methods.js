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