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
      this.pendingPaths = groupPaths(rec.paths, rec.sortPath);
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
            this.snapshot = new join.JoinedSnapshot(this.rec, mergeValue(this.pendingPaths.sortIndex, this.valueParts));
//            log('Finalized snapshot "%s": "%j"', this.rec, this.snapshot.val());
            if( this.pendingPaths.dynamics.length ) {
               log('%d dynamic paths were not included in this snapshot', this.pendingPaths.dynamics.length);
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
               //todo remove this defer when test units are done?
               util.defer(this._callbackCompleted, this);
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
            //todo remove this defer when test units are done?
            util.defer(this._callbackCompleted, this);
         }, this);
      },

      _callbackCompleted: function() {
         if( this.callbacksExpected === ++this.callbacksReceived) {
            if( this.pendingPaths.dynamics.length ) {
               // when all the intersect and join ops are retrieved, try resolving any dynamic paths
               this._resolveDynamicPaths(new join.JoinedSnapshot(this.rec, mergeValue(this.pendingPaths.sortIndex, this.valueParts)));
            }

            if( this.callbacksExpected === this.callbacksReceived ) {
               // either all dynamic paths are resolved or cannot be resolved,
               // so it's time to call this mission completed
               this._finalize();
            }
         }
      },

      _resolveDynamicPaths: function(newestSnap) {
         // try to resolve any dynamic paths which depend on data from the unions/intersections
         newestSnap && util.each(this.pendingPaths.dynamics, function(parts) {
            this._tryToResolve(parts, newestSnap);
         }, this);
      },

      _tryToResolve: function(parts, snap) {
         var path = parts[0];
         if( !path.isJoinedChild() ) {
            this._mergeDynamicChildren(parts);
         }
         else if( path.tryResolve(snap) ) {
            removeItem(this.pendingPaths.dynamics, parts);
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
      },

      _mergeDynamicChildren: function(parts) {
         var path = parts[0];
         var idx = parts[1];
         this.callbacksExpected++;
         mergeDynamicVal(path, this.valueParts, util.bind(function(mergedVal) {
            this.valueParts[idx] = mergedVal;
            this.callbacksReceived++;
            this._callbackCompleted();
         }, this));
      }
   };

   function createValue(path, snap) {
      var snapVal = snap.val(), finalVal = null;
      if( snapVal !== null && snapVal !== undefined ) {
         if( path.isJoinedChild() ) {
            finalVal = createChildValue(path, snapVal);
         }
         else {
            // if this is the joined parent, then we check each child to see if it's a primitive
            finalVal = {};
            snap.forEach(function(ss) {
               finalVal[ss.name()] = createChildValue(path, ss.val());
            });
         }
      }
      return finalVal;
   }

   function createChildValue(path, data) {
      var finalVal = null, keyMap = path.getKeyMap();
      if( !util.isEmpty(data) ) {
         finalVal = {};
         util.each(keyMap, function(toKey, fromKey) {
            if( fromKey === '.value' ) {
               finalVal[toKey] = data;
            }
            else if( !util.isEmpty(data[fromKey]) ) {
               finalVal[toKey] = data[fromKey];
            }
         });
      }
      return finalVal;
   }

   function mergeValue(sortIndex, valueParts) {
      var out = util.extend({}, valueParts[sortIndex]);
      util.each(valueParts, function(v, i) {
         i === sortIndex || util.extend(true, out, v);
      });
      return util.isEmpty(out)? null : out;
   }

   function groupPaths(paths, sortPath) {
      var out = { intersects: [], unions: [], dynamics: [], expect: 0, sortIndex: 0 };

      util.each(paths, function(path) {
         // child paths which are unresolved can be resolved after we fetch
         if( !path.isDynamic() ) {
            pathParts(out, sortPath, path);
         }
         else {
            // parent paths which are unresolved are a bit more tricky, store them separately (see _resolveDynamicPaths)
            out.dynamics.push(path);
         }
      });

      return out;
   }

   function pathParts(pendingPaths, sortPath, path) {
      if( path === sortPath ) {
         pendingPaths.sortIndex = pendingPaths.expect;
      }

      var parts = [path, pendingPaths.expect++];
      if( path.isIntersection() ) { pendingPaths.intersects.push(parts); }
      else { pendingPaths.unions.push(parts); }
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

   function mergeDynamicVal(path, valParts, callback) {
      var recsNeeded = 0, recsLoaded = 0, keysFound = {}, mergedVal = {};

      util.each(valParts, loadKeysFrom);

      function loadKeysFrom(valPart) {
         util.each(valPart, function(v, k) {
            if( !util.has(keysFound, k) ) {
               keysFound[k] = true;
               var ref = path.child(k);
               ref && getRec(k, ref);
            }
         });
      }

      function getRec(key, ref) {
         recsNeeded++;
         // prevent synchronous callbacks from Firebase from causing it
         // to complete before the next part to load has been counted
         util.defer(function() {
            ref.once('value', function(snap) {
               doneLoadingRec(key, snap.val());
            });
         });
      }

      function doneLoadingRec(key, val) {
         if( val !== null ) {
            mergedVal[key] = val;
         }
         if( ++recsLoaded === recsNeeded ) {
            callback(mergedVal);
         }
      }
   }

   /**
    * Any additional args passed to this method will be returned to the callback, after the snapshot, upon completion
    * @param rec
    * @param [callback]
    * @param [context]
    */
   join.buildSnapshot = function(rec, callback, context) {
      //todo this can't handle the parent joins correctly if they have dynamic paths :(
      var snap = new SnapshotBuilder(rec);
      if( callback ) {
         snap.value.apply(snap, util.toArray(arguments).slice(1));
      }
      return snap;
   };

   /**
    * @param {JoinedRecord} rec
    * @param data
    * @param {JoinedSnapshot} [childSnap]
    * @returns {*}
    */
   join.sortSnapshotData = function(rec, data, childSnap) {
      var out = data;
      if( rec.joinedParent ) {
         if( !util.isEmpty(data) ) {
            out = {};
            util.each(rec.paths, function(path) {
               util.each(path.getKeyMap(), function(key, fromKey) {
                  if( fromKey === '.value' ) {
                     out[key] = data;
                  }
                  else if( !util.isEmpty(data[key]) ) {
                     out[key] = data[key];
                  }
               });
            });
         }
      }
      else if( rec.sortedChildKeys ) {
         out = {};
         util.each(rec.sortedChildKeys, function(key) {
            if( childSnap && childSnap.name() === key && childSnap.val() !== undefined ) {
               out[key] = childSnap.val();
            }
            else if( !util.isEmpty(data[key]) ) {
               out[key] = data[key];
            }
         });
      }
      return util.isEmpty(out)? null : out;
   };
})(exports, fb);