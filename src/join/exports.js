(function(exports, fb) {

   /**
    * Sync to multiple Firebase paths and seamlessly merge the data into a single object.
    * An instance of this class should work if passed as a ref into angularFire objects.
    *
    * Accepts any number of {Firebase|Object|Function} arguments, see README for details.
    * @static
    */
   exports.join = function() {};

   /**
    * This returns the union of two or more paths (an OUTER JOIN).
    *
    * Accepts any number of {Firebase|Object|Function} arguments, see README for details.
    * @static
    */
   exports.union = function() {};

   /**
    * This is the intersection of the two or more paths (an INNER JOIN), so that only
    * records existing in all paths provided are returned.
    *
    * Accepts any number of {Firebase|Object|Function} arguments, see README for details.
    * @static
    */
   exports.intersection = function() {};

})(exports, fb);