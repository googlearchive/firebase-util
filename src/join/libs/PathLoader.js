(function (exports, fb) {
   "use strict";
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   /**
    * @param {Array} rawPathData
    * @constructor
    */
   function PathLoader(rawPathData) {
      var childKey;
      this._assertValidPaths(rawPathData);
      this.finalPaths = [];

      if( isChildPathArgs(rawPathData) ) {
         // occurs when loading child paths from a JoinedRecord, which
         // passes the parent JoinedRecord (paths[0]) and a key name (paths[1])
         this.joinedParent = rawPathData[1];
         this.refName = rawPathData[0];
         this.rootRef = this.joinedParent.rootRef;
         childKey = this.refName;
         // when we load a child of a child, it's not possible to determine which
         // branch the child comes off of until after the parent loads its keys
         // so we do a little dance magic here to determine which parent it comes from
         if( this.joinedParent.joinedParent ){
            this.queue = this._loadDeepChild(childKey);
         }
         else {
            this.queue = this._loadRecord(childKey);
         }
      }
      else {
         this.finalPaths = buildPaths(rawPathData);
         this.refName = makeMasterName(this.finalPaths);
         this.rootRef = this.finalPaths[0].ref().root();
         this.queue = util.createQueue(pathCallbacks(this.finalPaths));
      }

      this.queue.done(function() {
         this.intersections = intersections(this.finalPaths);
         this.sortPath = findSortPath(this.finalPaths, this.intersections);
         this._assertSortPath();
         reconcilePathKeys(this.finalPaths);
      }, this);
   }

   PathLoader.prototype = {

      _assertValidPaths: function(paths) {
         if( !paths || !paths.length ) {
            throw new Error('Cannot construct a JoinedRecord without at least 1 path');
         }
         if( !isChildPathArgs(paths) ) {
            util.each(paths, this._assertValidPath, this);
         }
      },

      _assertValidPath: function(p, i) {
         if( !isValidRef(p) ) {
            if( !util.isObject(p) || !isValidRef(p.ref) ) {
               throw new Error(util.printf('Invalid path at position %d; it must be a valid Firebase or JoinedRecord instance, or if a props object is used, contain a ref key which is a valid instance', i));
            }
         }
      },

      _assertSortPath: function() {
         if( !this.sortPath ) {
            throw new Error('Did not set a sort path. Should not be able to create this condition');
         }
         if( !util.isEmpty(this.intersections) && !this.sortPath.isIntersection() ) {
            throw new Error(util.printf('Sort path cannot be set to a non-intersecting path as this makes no sense', this.name()));
         }
      },

      _loadDeepChild: function(childKey) {
         return util.createQueue()
            .addCriteria(function(cb) {
               this.joinedParent.queue.done(function() {
                  var parentPath = searchForParent(this.joinedParent.paths, childKey);
                  if( parentPath.isDynamic() ) {
                     this.finalPaths.push(new join.Path({
                        ref: parentPath.ref()||parentPath.props.ref.push(),
                        keyMap: {'.value': '.value'}
                     }, parentPath));
                  }
                  else {
                     this.finalPaths.push(parentPath.child(childKey));
                  }
                  cb();
               }, this);
            }, this);
      },

      _loadRecord: function(childKey) {
         var q = util.createQueue();
         var finalPaths = this.finalPaths;
         var joinedParent = this.joinedParent;
         q.addCriteria(function(cb) {
            joinedParent.queue.done(function() {
               util.each(joinedParent.paths, function(parentPath) {
                  var childPath = parentPath.child(childKey);
                  finalPaths.push(childPath);
                  util.each(parentPath.getDynamicKeys(), function(path, key) {
                     var aliasedKey = parentPath.aliasedKey(key);
                     childPath.removeConflictingKey(key);
                     finalPaths.push(path.dynamicChild(childPath.child(key).ref(), aliasedKey));
                  })
               });
               util.createQueue(pathCallbacks(finalPaths)).done(cb);
            });
         }, this);
         return q;
      }
   };

   function buildPaths(paths) {
      return util.map(paths, function(props) {
         return props instanceof join.Path? props : new join.Path(props);
      })
   }

   function searchForParent(paths, childKey) {
      return util.find(paths, function(p) { return p.hasKey(childKey); }) || findSortPath(paths, intersections(paths));
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
            path.observeOnce('keyMapLoaded', cb.bind(null, null));
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

   function isValidRef(ref) {
      return ref instanceof Firebase || ref instanceof join.JoinedRecord || ref instanceof join.Path;
   }

   function isChildPathArgs(args) {
      return args && args.length === 2 && typeof(args[0]) === 'string' && args[1] instanceof join.JoinedRecord;
   }

   join.PathLoader = PathLoader;

})(exports, fb);