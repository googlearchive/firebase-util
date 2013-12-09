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
         else if( pathProps instanceof util.Firebase || pathProps instanceof join.JoinedRecord ) {
            pathProps = { ref: pathProps };
         }
         return factory(pathProps);
      });
      return util.construct(join.JoinedRecord, paths);
   }
})(exports, fb);