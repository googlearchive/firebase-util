(function (exports, fb) {
   "use strict";
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   function PathLoader(paths) {
      var countNeeded;
      var countCompleted = 0;
      var waiting = [];

      this.done = function(cb, context) {
         if( countNeeded === countCompleted ) {
            notify([cb, context]);
         }
         else {
            waiting.push([cb, context]);
         }
      };

      countNeeded = paths.length;
      util.each(paths, addPath);

      function addPath(path) {
         path.observe('keyMapLoaded', pathLoaded);
      }

      function pathLoaded() {
         if( ++countCompleted === countNeeded ) {
            reconcilePathKeys(paths);
            util.each(waiting, notify);
         }
      }

      function notify(parts) {
         parts[0].call(parts[1]||null);
      }
   }

   /**
    * Okay, so the idea here is that key conflicts have to be resolved. The method we've picked for this
    * is that the last path wins. Basically, each additional path "extends" the prior one jQuery style.
    *
    * Now this method prevents the need for every point where we merge or reconcile data to look through
    * every path to see which ones have the key, and which one should win if more than one contains it.
    *
    * Instead, we just remove them directly from the paths.
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

   join.PathLoader = PathLoader;

})(exports, fb);