(function(exports, fb) {
   var undefined;
   var util = fb.pkg('util');
   var log  = fb.pkg('log');
   var join = fb.pkg('join');

   /**
    * Builds snapshots by calling once('value', ...) against each path. Paths are resolved iteratively so
    * that dynamic paths can be loaded once enough data is present for their needs. All data is applied
    * in the order the paths were declared (not in the order they return from Firebase) ensuring merging
    * looks correct.
    *
    * Use this by calling fb.pkg('join').buildSnapshot(...).
    *
    * @param {JoinedRecord} rec
    * @constructor
    */
   function SnapshotBuilder(rec) {
      this.rec = rec;
      this.observers = [];
      this.valueParts = [];
      this.callbacksExpected = 0;
      this.callbacksReceived = 0;
      this.state = 'unloaded';
      this.snapshot = null;
      this.subs = [];
      this.pendingPaths = groupPaths(rec.paths);
      log.debug('SnapshotBuilder<constructor>(%s) intersects: %d, unions: %d, unresolved: %d',
         rec,
         this.pendingPaths.intersects.length,
         this.pendingPaths.unions.length,
         this.pendingPaths.unresolved.length
      );
   }

   SnapshotBuilder.prototype = {
      /**
       * @param {Function} callback
       * @param [context]
       */
      value: function(callback, context) {
         this.observers.push(util.toArray(arguments));
         if( this.state === 'loaded' ) {
            this._notify();
         }
         else if( this.state === 'unloaded' ) {
            this._process();
         }
         return this;
      },

      ref: function() {
         return this.rec;
      },

      _process: function() {
         this.state = 'processing';

         // load all intersecting paths and then all unions
         util.each(this.pendingPaths.intersects, this._loadIntersection, this);

         // and then all unions
         util.each(this.pendingPaths.unions, this._loadUnion, this);
      },

      _finalize: function() {
         // should only be called exactly once
         if( this.state !== 'loaded' ) {
            this.state = 'loaded';
            util.each(this.subs, function(s) { s(); });
            this.subs = null;
            this.snapshot = new join.JoinedSnapshot(this.rec, mergeValue(this.valueParts));
            log('SnapshotBuilder(%s): finalized snapshot "%j"', this.rec, this.snapshot.val());
            if( this.pendingPaths.unresolved.length ) {
               log.info('%d unresolved paths were not included in this snapshot', this.pendingPaths.unresolved.length);
            }
            util.defer(this._notify, this);
         }
      },

      _notify: function() {
         var snapshot = this.snapshot;
         util.each(this.observers, function(obsArgs) {
            obsArgs[0].apply(obsArgs[1]||null, [snapshot].concat(obsArgs.splice(2)));
         });
         this.observers = [];
      },

      _loadIntersection: function(parts) {
         var path = parts[0];
         var myIndex = parts[1];
         this.callbacksExpected++;
//         log('_loadIntersection: initialized "%s"', path.toString());
         deferredDisposable(this.subs, path.ref(), 'value', function(snap) {
//            log('SnapshotBuilder._loadIntersection completed "%s" with value "%j"', path.toString(), snap.val());
            if( snap.val() === null ) {
               // all intersected values must be present or the total value is null
               // so we can abort the load here and send out notifications
               this.valueParts = [];
               this._finalize();
            }
            else {
               this.valueParts[myIndex] = createValue(path, snap);
               this._callbackCompleted(snap);
            }
         }, this);
      },

      _loadUnion: function(parts) {
         var path = parts[0];
         var myIndex = parts[1];
         this.callbacksExpected++;
//         log('_loadUnion: initialized "%s"', path.toString());
         deferredDisposable(this.subs, path.ref(), 'value', function(snap) {
//            log('_loadUnion: completed "%s" with value "%j"', path.toString(), snap.val());
            this.valueParts[myIndex] = createValue(path, snap);
            util.defer(this._callbackCompleted, this);
         }, this);
      },

      _callbackCompleted: function() {
         if( this.callbacksExpected === ++this.callbacksReceived) {
            if( this.pendingPaths.unresolved.length ) {
               // when all the intersect and join ops are retrieved, try resolving any dynamic paths
               this._resolveDynamicPaths(new join.JoinedSnapshot(this.rec, mergeValue(this.valueParts)));
            }

            if( this.callbacksExpected === this.callbacksReceived ) {
               // either all dynamic paths are resolved or cannot be resolved,
               // so it's time to call this mission completed
               this._finalize();
            }
         }
      },

      _resolveDynamicPaths: function(newestSnap) {
         // try to resolve any unresolved dynamic paths which depend on data from the unions/intersections
         newestSnap && util.each(this.pendingPaths.unresolved, function(path) {
            this._tryToResolve(path, newestSnap);
         }, this);
      },

      _tryToResolve: function(parts, snap) {
         var path = parts[0];
         if( path.tryResolve(snap) ) {
            removeItem(this.pendingPaths.unresolved, parts);
            if( path.isIntersection() ) {
               this._loadIntersection(parts);
            }
            else {
               this._loadUnion(parts);
            }
         }
         else {
            log.info('Could not resolve dynamic path "%s" for snapshot "%j"', path, snap.val());
         }
      }
   };

   function createValue(path, snap) {
      var snapVal = snap.val(), finalVal = null;
      if( snapVal !== null && snapVal !== undefined ) {
         if( path.isJoinedChild() ) {
            if( util.isObject(snapVal) ) {
               finalVal = snapVal;
            }
            else {
               var key = findPrimitiveKey(path);
               finalVal = {};
               finalVal[key] = snapVal;
            }
         }
         else {
            // if this is the joined parent, then we check each child to see if it's a primitive
            finalVal = {};
            snap.forEach(function(ss) {
               finalVal[ss.name()] = createValue(path.childPath(ss.ref(), ss.name()), ss);
            });
         }
      }
      return finalVal;
   }

   function findPrimitiveKey(path) {
      var keyMap = path.getKeyMap();
      if( keyMap['.value'] ) { return keyMap['.value']; }
      else { return path.name(); }
   }

   function mergeValue(parts) {
      var out = util.extend.apply(null, [true, {}].concat(parts));
      return util.isEmpty(out)? null : out;
   }

   function groupPaths(paths) {
      var out = { intersects: [], unions: [], dynamics: [], unresolved: [], expect: 0 };

      util.each(paths, function(path) {
         // we can't use dynamic paths; if this is a child, it's already resolved
         // if it's the parent, then dynamic paths are useless to us
         if( path.isUnresolved() || !path.isDynamic() ) {
            var parts = [path, out.expect++];
            if( path.isUnresolved() ) { out.unresolved.push(parts); }
            else if( path.isIntersection() ) { out.intersects.push(parts); }
            else { out.unions.push(parts); }
         }
         else {
            log("Called 'value' on a JoinedRecord which contains dynamic paths (they were excluded): %s", this.rec.toString());
         }
      });

      return out;
   }

   function removeItem(list, item) {
      var i = util.indexOf(list, item);
      if( i > -1 ) {
         list.splice(i, 1);
      }
   }

   function deferredDisposable(subs, ref, event, fn, context) {
      // if Firebase data is cached locally, this method could return before all the
      // load methods have even been called, causing some issues with the counters
      // so we defer to ensure everything is counted
      util.defer(function() {
         ref.once(event, fn, context);
         subs.push(function() {
            ref.off(event, fn, context);
         });
      });
   }

   // intended for use with instanceof; should use fb.join.buildSnapshot() to instantiate
   join.SnapshotBuilder = SnapshotBuilder;

   /**
    * Any additional args passed to this method will be returned to the callback, after the snapshot, upon completion
    * @param rec
    * @param [callback]
    * @param [context]
    */
   join.buildSnapshot = function(rec, callback, context) {
      var snap = new SnapshotBuilder(rec);
      if( callback ) {
         snap.value.apply(snap, util.toArray(arguments).slice(1));
      }
      return snap;
   };
})(exports, fb);