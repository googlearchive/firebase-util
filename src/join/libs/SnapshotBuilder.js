(function(exports, fb) {
   var join = fb.package('join');

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
            if( this.groupedPaths.unresolved.length ) {
               fb.log('%d unresolved paths were not included in this snapshot', this.groupedPaths.unresolved.length);
            }
            this._notify();
         }
      },

      _notify: function() {
         var snapshot = this.snapshot;
         fb.util.each(this.observers, function(obs) {
            obs[0].apply(obs[1], [snapshot].concat(obs.splice(2)));
         });
         this.observers = [];
      },

      _loadIntersection: function(parts) {
         var path = parts[0];
         var myIndex = parts[1];
         this.callbacksExpected++;
         disposable(this.subs, path.ref(), 'value', function(snap) {
            var v = snap.val();
            if( v === null ) {
               // all intersected values must be present or the total value is null
               this.valueParts = [];
               this._finalize();
            }
            else {
               this.valueParts[myIndex] = v;
               this._callbackCompleted();
            }
         }, this);
      },

      _loadUnion: function(parts) {
         var path = parts[0];
         var myIndex = parts[1];
         this.callbacksExpected++;
         disposable(this.subs, path.ref(), 'value', function(snap) {
            this.valueParts[myIndex] = snap.val();
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
      }
   };

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
