(function (exports, fb) {
   "use strict";
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   /**
    * @param {JoinedRecord|null} joinedParent
    * @param {Array} rawPathData
    * @param {string} [childKey]
    * @param {bool} [pathSearch]
    * @constructor
    */
   function PathLoader(joinedParent, rawPathData, childKey, pathSearch) {
      var hasChildKey = !util.isEmpty(childKey);
      var sourcePaths = buildPaths(rawPathData);
      this.refName = hasChildKey? childKey : makeMasterName(sourcePaths);
      this.rootRef = joinedParent? joinedParent.rootRef : sourcePaths[0].ref().root();
      if( hasChildKey && pathSearch ) {
         this.finalPaths = [];
         this.intersections = [];
         this.q = util.createQueue()
            .chain(joinedParent.queue)
            .done(function() {
               this.sortPath = searchForPath(joinedParent.paths, childKey);
               if( this.sortPath ) {
                  this.finalPaths.push(this.sortPath);
                  this.sortPath.isIntersection() && this.intersections.push(this.sortPath);
               }
            }, this);
      }
      else {
         this.finalPaths = simplePaths(sourcePaths, childKey);
         this.intersections = intersections(this.finalPaths);
         this.sortPath = findSortPath(this.finalPaths, this.intersections);
         this.q = util.createQueue(pathCallbacks(this.finalPaths));
      }
      this.q.done(function() {
         reconcilePathKeys(this.finalPaths);
      }, this);
   }

   PathLoader.prototype.done = function(fn, ctx) {
      this.q.done(fn, ctx);
      return this;
   };

   PathLoader.prototype.fail = function(fn, ctx) {
      this.q.fail(fn, ctx);
      return this;
   };

   function buildPaths(paths) {
      return util.map(paths, function(props) {
         return props instanceof join.Path? props : new join.Path(props);
      })
   }

   function simplePaths(paths, childKey) {
      var b = !util.isEmpty(childKey);
      return util.map(paths, function(p) {
         return b? p.child(childKey) : p;
      })
   }

   function searchForPath(paths, childKey) {
      var p = util.find(paths, function(p) { return p.hasKey(childKey); }) || findSortPath(paths, intersections(paths));
      return p? p.child(childKey) : null;
   }

   function findSortPath(paths, intersections) {
      return util.find(paths, function(p) { return p.isSortBy(); })
         || (util.isEmpty(intersections)? paths[0] : intersections[0]);
   }

   function intersections(paths) {
      return util.filter(paths, function(p) { return p.isIntersection() });
   }

   /**
    * Wrap paths in a callback that can be invoked by Queue
    */
   function pathCallbacks(paths) {
      return util.map(paths, function(path) {
         return function(cb) {
            path.observe('keyMapLoaded', util.bind(cb, null, null));
         }
      });
   }

   /**
    * The idea here is that key conflicts have to be resolved. The method we've picked for this
    * is that the last path wins. Basically, each additional path "extends" the prior one jQuery style.
    *
    * Now this method prevents the need for every point where we merge or reconcile data to look through
    * every path to see which ones have the key, and which one should win if more than one contains it.
    *
    * Instead, we just remove them directly from the paths when they load.
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

   function makeMasterName(paths) {
      var names = util.map(paths, function(p) { return p.ref().name(); });
      return names.length > 1? '['+names.join('][')+']' : names[0];
   }

   join.PathLoader = PathLoader;

})(exports, fb);