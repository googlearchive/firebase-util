(function (exports, fb) {
   "use strict";
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   function PathLoader(rec, paths) {
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

      init();

      function addPath(pathProps) {
         rec._addPath(new join.Path(pathProps, pathLoaded));
      }

      function pathLoaded() {
         if( ++countCompleted === countNeeded ) {
            util.each(waiting, notify);
         }
      }

      function notify(parts) {
         parts[0].call(parts[1]||null);
      }

      function init() {
         if( paths[0] instanceof join.JoinedRecord ) {
            rec.joinedParent = paths[0];
            countNeeded = rec.joinedParent.paths.length;
            util.each(rec.joinedParent.paths, function(parentPath) {
               // the child paths are merged as a union which is very appropriate
               // for a child of the joined path where we'll want all the data, and not a subset
               // also, there's no keyMap to load; yay!
               rec._addPath(parentPath.childPath(rec, paths[1]));
            }, rec);
         }
         else {
            countNeeded = paths.length;
            util.each(paths, addPath);
         }
      }
   }

   join.PathLoader = PathLoader;

})(exports, fb);