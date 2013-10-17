(function(exports, fb) {
   var join = fb.package('join');

   /**
    * Builds snapshots by calling once('value', ...) against each path. Paths are resolved iteratively so
    * that dynamic paths can be loaded once enough data is present for their needs. All data is applied
    * in the order the paths were declared (not in the order they return from Firebase) ensuring merging
    * looks correct.
    *
    * Use this by calling fb.package('join').buildSnapshot(...).
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
      this.groupedPaths = groupPaths(rec.paths);
   }

   SnapshotBuilder.prototype = {
      /**
       * @param {Function} callback
       * @param [context]
       */
      value: function(callback, context) {
         this.observers.push(fb.util.toArray(arguments));
         if( this.state === 'loaded' ) {
            this._notify();
         }
         else {
            this._process();
         }
         return this;
      },

      _process: function() {
         this.state = 'processing';
         this._processPathsAgain();
      },

      /**
       * Each time new paths resolve, call this again with the latest snapshot available, so that we can try to
       * resolve any remaining dynamic paths. Once all paths have resolved, this will also trigger finalize().
       *
       * @param [newestSnap]
       */
      _processPathsAgain: function(newestSnap) {
         if( this.state !== 'loaded' ) {
            fb.util.each(this.groupedPaths.intersects, this._loadIntersection, this);
            fb.util.each(this.groupedPaths.unions, this._loadUnion, this);
            this.groupedPaths.intersects = [];
            this.groupedPaths.unions = [];
            newestSnap && fb.util.each(this.groupedPaths.unresolved, function(path) {
               this._tryToResolve(path, newestSnap);
            }, this);
            if( this.callbacksExpected === this.callbacksReceived ) {
               // either all paths have resolved or those which cannot be resolved will never resolve
               // so it's time to call this mission completed
               this._finalize();
            }
         }
      },

      _finalize: function() {
         if( this.state !== 'loaded' ) {
            this.state = 'loaded';
            fb.util.each(this.subs, function(s) { s(); });
            this.subs = null;
            this.snapshot = new join.JoinedSnapshot(this.rec, mergeValue(this.valueParts));
            fb.log.debug('finalized snapshot "%j"', this.snapshot.val()); //debug
            if( this.groupedPaths.unresolved.length ) {
               fb.log('%d unresolved paths were not included in this snapshot', this.groupedPaths.unresolved.length);
            }
            this._notify();
         }
      },

      _notify: function() {
         var snapshot = this.snapshot;
         fb.util.each(this.observers, function(obsArgs) {
            obsArgs[0].apply(obsArgs[1], [snapshot].concat(obsArgs.splice(2)));
         });
         this.observers = [];
      },

      _loadIntersection: function(parts) {
         var path = parts[0];
         var myIndex = parts[1];
         this.callbacksExpected++;
         disposable(this.subs, path.ref(), 'value', function(snap) {
            fb.log.debug('_loadIntersection: loaded path "%s" with value "%j"', path.toString(), snap.val());
            if( snap.val() === null ) {
               // all intersected values must be present or the total value is null
               // so we can abort the load here and send out notifications
               this.valueParts = [];
               this._finalize();
            }
            else {
               this.valueParts[myIndex] = createValue(path, snap);
               this._callbackCompleted();
            }
         }, this);
      },

      _loadUnion: function(parts) {
         var path = parts[0];
         var myIndex = parts[1];
         this.callbacksExpected++;
         disposable(this.subs, path.ref(), 'value', function(snap) {
            fb.log.debug('_loadUnion: loaded path "%s" with value "%j"', path.toString(), snap.val());
            this.valueParts[myIndex] = createValue(path, snap);
            this._callbackCompleted();
         }, this);
      },

      _callbackCompleted: function() {
         if( this.callbacksExpected === ++this.callbacksReceived) {
            // once all the intersect and join ops are retrieved, try resolving any dynamic paths again
            this._processPathsAgain(new join.JoinedSnapshot(this.rec, mergeValue(this.valueParts)));
         }
      },

      _tryToResolve: function(parts, snap) {
         var path = parts[0];
         if( path.tryResolve(snap) ) {
            removeItem(this.groupedPaths.unresolved, parts);
            if( path.isIntersection() ) {
               this._loadIntersection(parts);
            }
            else {
               this._loadUnion(parts);
            }
         }
         else {
            fb.log.info('Could not resolve dynamic path "%s" for snapshot "%j"', path.toString(), snap.val());
         }
      }
   };

   function createValue(path, snap) {
      var snapVal = snap.val(), finalVal = null;
      if( snapVal !== null ) {
         if( path.isJoinedChild() ) {
            if( fb.util.isObject(snapVal) ) {
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
      var out = fb.util.extend.apply(null, [true, {}].concat(parts));
      return fb.util.isEmpty(out)? null : out;
   }

   function groupPaths(paths) {
      var out = { intersects: [], unions: [], dynamics: [], unresolved: [], expect: 0 };

      fb.util.each(paths, function(path) {
         // we can't use dynamic paths; if this is a child, it's already resolved
         // if it's the parent, then dynamic paths are useless to us
         if( path.isUnresolved() || !path.isDynamic() ) {
            var parts = [path, out.expect++];
            if( path.isUnresolved() ) { out.unresolved.push(parts); }
            else if( path.isIntersection() ) { out.intersects.push(parts); }
            else { out.unions.push(parts); }
         }
         else {
            fb.log("Called 'value' on a JoinedRecord which contains dynamic paths (they were excluded): %s", this.rec.toString());
         }
      });

      return out;
   }

   function removeItem(list, item) {
      var i = fb.util.indexOf(list, item);
      if( i > -1 ) {
         list.splice(i, 1);
      }
   }

   function disposable(subs, ref, event, fn, context) {
      ref.once(event, fn, context);
      subs.push(function() {
         ref.off(event, fn, context);
      });
   }

   /**
    * Any additional args passed to this method will be returned to the callback, after the snapshot, upon completion
    * @param rec
    * @param [callback]
    * @param [context]
    */
   fb.join.buildSnapshot = function(rec, callback, context) {
      var snap = new SnapshotBuilder(rec);
      if( callback ) {
         snap.value.apply(snap, fb.util.toArray(arguments).slice(1));
      }
      return snap;
   };
})(exports, fb);