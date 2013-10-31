(function(exports, fb) {
   var undefined;
   var util = fb.pkg('util');
   var log  = fb.pkg('log');
   var join = fb.pkg('join');
   var EVENTS = ['child_added', 'child_removed', 'child_changed', 'child_moved', 'value'];

   function JoinedRecord() {
      this._super(this, EVENTS, util.bindAll(this, {
         onEvent: this._eventTriggered,
         onAdd: this._monitorEvent,
         onRemove: this._stopMonitoringEvent
      }));
      this.joinedParent = null;
      this.paths = [];
      this.sortPath = null;
      this.sortedChildKeys = [];
      this.childRecs = {};
      // values in this hash may be null, use util.has() when
      // checking to see if a record exists!
      this.loadingChildRecs = {};
      this.priorValue = undefined;
      this.currentValue = undefined;
      this.prevChildName  = null;
      this.intersections = [];
      this._loadPaths(util.toArray(arguments));
      this.refName = makeRefName(this);
   }

   JoinedRecord.prototype = {
      auth: function(authToken, onComplete, onCancel) {
         return this.sortPath.ref().auth(authToken, onComplete, onCancel);
      },

      unauth: function() {
         return this.sortPath.ref().unauth();
      },

      on: function(eventType, callback, cancelCallback, context) {
         if( util.isObject(cancelCallback) && arguments.length === 3 ) {
            context = cancelCallback;
            cancelCallback = null;
         }

         var obs = this.observe(eventType, callback, context, cancelCallback);

         if( eventType === 'value' ) {
            if( this._isValueLoaded() ) {
               var snap = makeSnap(this);
               obs.notify(snap);
               this._eventTriggered('value', 1, snap);
            }
            else {
               this.pathsLoaded(function() {
                  this._myValueChanged();
               }, this);
            }
         }
         else if( eventType === 'child_added' && this.joinedParent ) {
            this._notifyExistingRecsAdded(obs);
         }
      },

      off: function(eventType, callback, context) {
         this.stopObserving(eventType, callback, context);
         return this;
      },

      once: function(eventType, callback, failureCallback, context) {
         if( util.isObject(failureCallback) && arguments.length === 3 ) {
            context = failureCallback;
            failureCallback = null;
         }

         var fn = function(snap, prevChild) {
            this.off(eventType, fn, this);
            if( typeof(callback) === util.Observer )
               callback.notify(snap, prevChild);
            else
               callback.call(context, snap, prevChild);
         };

         this.on(eventType, fn, failureCallback, this);
      },

      child: function(childPath) {
         var ref;
         var parts = childPath.split('/'), firstPart = parts.shift();
         if( this.joinedParent ) {
            ref = this._findFirebaseRefForChild(firstPart)
         }
         else if( this._isChildLoaded(firstPart) ) {
            // I already have this child record loaded so just return it
            ref = this._getJoinedChild(firstPart);
         }
         else {
            // this is the joined parent, so we fetch a JoinedRecord as the child
            // this constructor syntax is for internal use only and not documented in the API
            ref = new JoinedRecord(this, firstPart);
         }

         // we've only processed the first bit of the child path, so if there are more, fetch them here
         return parts.length? ref.child(parts.join('/')) : ref;
      },

      parent:          function() {
         return this.joinedParent || this.sortPath.ref().parent();
      },

      name: function() {
         return this.refName;
      },

      set:             function(value, onComplete) {},
      setWithPriority: function(value, priority, onComplete) {},
      setPriority:     function(priority, onComplete) {},
      update:          function(value, onComplete) {},
      remove:          function(onComplete) {},
      push:            function(value, onComplete) {},
      root:            function() { return this.sortPath.ref().root(); },
      ref:             function() { return this; },

      toString: function() { return '['+util.map(this.paths, function(p) { return p.toString(); }).join('][')+']'; },

      //////// methods that are not allowed
      onDisconnect:    function() { throw new Error('onDisconnect() not supported on JoinedRecord'); },
      limit:           function() { throw new Error('limit not supported on JoinedRecord; try calling limit() on ref before passing into Firebase.Util'); },
      endAt:           function() { throw new Error('endAt not supported on JoinedRecord; try calling endAt() on ref before passing into Firebase.Util'); },
      startAt:         function() { throw new Error('startAt not supported on JoinedRecord; try calling startAt() on ref before passing into Firebase.Util.join'); },
      transaction:     function() { throw new Error('transactions not supported on JoinedRecord'); },

      pathsLoaded: function(callback, scope) {
         this.pathLoader.done(callback, scope);
      },

      _monitorEvent: function(eventType) {
         if( this.getObservers(eventType).length === 1 ) {
            this.pathsLoaded(function() {
               paths = this.joinedParent || !this.intersections.length? this.paths : this.intersections;
               if( this.hasObservers(eventType) && !paths[0].hasObservers(eventType) ) {
                  var paths;
                  (this.joinedParent? log.debug : log)('Now observing event "%s" for JoinedRecord(%s)', eventType, this.name());
                  if( this.joinedParent ) {
                     util.call(paths, 'observe', eventType, this._pathNotification, this);
                  }
                  else if( !paths[0].hasObservers() ) {
                     log.info('My first observer attached, loading my joined data and Firebase connections for JoinedRecord(%s)', this.name());
                     // this is the first observer, so start up our path listeners
                     util.each(paths, function(path) {
                        path.observe(eventsToMonitor(this, path), this._pathNotification, this);
                     }, this);
                  }
               }
            }, this);
         }
      },

      _stopMonitoringEvent: function(eventType, obsList) {
         var obsCountRemoved = obsList.length;
         this.pathsLoaded(function() {
            if( obsCountRemoved && !this.hasObservers(eventType) ) {
               (this.joinedParent? log.debug : log)('Stopped observing %s events on JoinedRecord(%s)', eventType? '"'+eventType+'"' : '', this.name());
               if( this.joinedParent ) {
                  util.call('paths', 'stopObserving', eventType, this._pathNotification, this);
               }
               else if( !this.hasObservers() ) {
                  log.info('My last observer detached, releasing my joined data and Firebase connections, JoinedRecord(%s)', this.name());
                  // nobody is monitoring this event anymore, so we'll stop monitoring the path now
                  var paths = this.intersections.length? this.intersections : this.paths;
                  util.call(paths, 'stopObserving');
                  var oldRecs = this.childRecs;
                  this.childRecs = {};
                  util.each(oldRecs, this._removeChildRec, this);
                  this.sortedChildKeys = [];
                  this.currentValue = undefined;
               }
            }
         }, this);
      },

      // this should never be called by a dynamic path, only by primary paths
      // that are controlling when a record gets created and processed
      _pathNotification: function(path, event, childName, mappedVals, prevChild, childSnap) {
         var rec;
         log.debug('Received "%s" from Path(%s): %j', event, path, this.joinedParent? mappedVals:childSnap.val());

         if( this.joinedParent ) {
            // most of the child record events are just pretty much a passthrough
            switch(event) {
               case 'value':
                  this._myValueChanged();
                  break;
               default:
                  this.triggerEvent(event, childSnap);
            }
         }
         else {
            rec = this.child(childName);
            switch(event) {
               case 'child_added':
                  if( mappedVals !== null ) {
                     this._pathAddEvent(path, rec, prevChild);
                  }
                  break;
               case 'child_moved':
                  if( this.sortPath === path && this._isChildLoaded(childName) ) {
                     this._moveChildRec(rec, prevChild);
                  }
                  break;
            }
         }
      },

      notifyCancelled: function() {}, // nothing to do, required by Observer interface

      _isValueLoaded: function() {
         return this.currentValue !== undefined;
      },

      _isChildLoaded: function(key) {
         if( util.isObject(key) ) { key = key.name(); }
         return this._getJoinedChild(key) !== undefined;
      },

      // must be called before any on/off events
      _loadPaths: function(pathArgs) {
         util.each(buildPaths(this, pathArgs), this._addPath, this);
         this.pathLoader = new join.PathLoader(this.paths);
         if( this.sortPath ) {
            if( !util.isEmpty(this.intersections) && !this.sortPath.isIntersection() ) {
               log.warn('Sort path cannot be set to a non-intersecting path as this makes no sense; using the first intersecting path instead in JoinedRecord(%s)', this.name());
               this.sortPath = this.intersections[0];
            }
         }
         else if( !util.isEmpty(this.intersections) ) {
            this.sortPath = this.intersections[0];
         }
         else {
            this.sortPath = util.find(this.paths, function(path) {
               return !path.isDynamic();
            });
         }

         if( !this.sortPath ) {
            throw new Error('No valid Firebase refs provided (must provide at least one actual Firebase ref');
         }
      },

      // must be called before any on/off events
      _addPath: function(path) {
         this.paths.push(path);
         if( this.sortPath ) {
            path.props.setSortBy(false);
         }
         else if( path.isSortBy() ) {
            this.sortPath = path;
         }
         if( path.isIntersection() ) {
            this.intersections.push(path);
         }
         return path;
      },

      /**
       * Called when a child_added event occurs on a Path I monitor.
       * @param path
       * @param rec
       * @param prevName
       * @returns {*}
       * @private
       */
      _pathAddEvent: function(path, rec, prevName) {
         this._assertIsParent('_pathAddEvent');
         // The child may already exist if another Path has declared it
         // or it may be loading as we speak, so evaluate each case
         var childName = rec.name();
         var isLoading = util.has(this.loadingChildRecs, childName);
         if( !isLoading && !this._isChildLoaded(childName) ) {
            // the record is new: not currently loading and not loaded before
            if( !rec._isValueLoaded() ) {
               // the record has no value yet, so we fetch it and then we call _addChildRec again
               this.loadingChildRecs[childName] = prevName;
               rec.once('value', function() {
                  // the prevName may have been updated while we were fetching the value so we use
                  // the cached one here instead of the prevName argument
                  var prev = this.loadingChildRecs[childName];
                  rec.prevChildName = prev;
                  delete this.loadingChildRecs[childName];
                  this._addChildRec(rec, prev);
               }, this);
            }
            else {
               this._addChildRec(rec, prevName)
            }
         }
         else if( path === this.sortPath ) {
            // the rec has already been added by at least one other path but this is the sortPath,
            // so it may have been put temporarily into the wrong place based on another path's sort info
            if( isLoading ) {
               // the rec is still loading, so simply change the prev record id
               this.loadingChildRecs[childName] = prevName;
            }
            else {
               // the child has already loaded from another path (this should only happen for unions)
               // so we move it instead
               this._moveChildRec(rec, prevName);
            }
         }
      },

      // only applicable to the parent joined path
      _addChildRec: function(rec, prevName, skipValueSet) {
         this._assertIsParent('_addChildRec');
         var childName = rec.name();
         if( rec.currentValue !== null && !this._isChildLoaded(childName) ) {
            log.debug('Added child rec %s to JoinedRecord(%s) after %s', rec, this.name(), prevName);
            // the record is new and has already loaded its value and no intersection path returned null,
            // so now we can add it to our child recs
            var nextRec = this._addRecAfter(rec, prevName);
            this.childRecs[childName] = rec;
            if( this._isValueLoaded() && !util.has(this.currentValue, childName) ) {
               // we only store the currentValue on this record if somebody is monitoring it,
               // otherwise we have to perform a wasteful on('value',...) for all my join paths each
               // time there is a change
               this._setMyValue(join.sortSnapshotData(this, this.currentValue, makeSnap(rec)));
            }
            this.triggerEvent('child_added', makeSnap(rec));
            nextRec && this.triggerEvent('child_moved', makeSnap(nextRec), childName);
            rec.on('value', this._updateChildRec, this);
         }
         return rec;
      },

      // only applicable to the parent join path
      _removeChildRec: function(rec) {
         this._assertIsParent('_removeChildRec');
         var childName = rec.name();
         rec.stopObserving(null, this._updateChildRec, this);
         if( this._isChildLoaded(rec) ) {
            log.debug('Removed child rec %s from JoinedRecord(%s)', rec, this.name());
            var i = util.indexOf(this.sortedChildKeys, childName);
            rec.off('value', this._updateChildRec, this);
            if( i > -1 ) {
               this.sortedChildKeys.splice(i, 1);
               if( i < this.sortedChildKeys.length ) {
                  var nextRec = this.child(this.sortedChildKeys[i]);
                  this.triggerEvent('child_moved', makeSnap(nextRec), i > 0? this.sortedChildKeys[i-1] : null);
               }
            }
            delete this.childRecs[childName];
            if( this._isValueLoaded() ) {
               delete this.currentValue[childName];
               this.triggerEvent('value', makeSnap(this));
            }
            this.triggerEvent('child_removed', makeSnap(rec, rec.priorValue));
         }
         return rec;
      },

      // only applicable to the parent join path
      _updateChildRec: function(snap) {
         this._assertIsParent('_updateChildRec');
         if( this._isChildLoaded(snap.name()) ) {
            if( snap.val() === null ) {
               this._removeChildRec(snap.ref());
            }
            else if( this._isValueLoaded() ) {
               if( !snap.isEqual(this.currentValue[snap.name()]) ) {
                  this._setMyValue(join.sortSnapshotData(this, this.currentValue, snap));
                  this.triggerEvent('child_changed', snap);
               }
            }
            else {
               this.triggerEvent('child_changed', snap);
            }
         }
      },

      // only applicable to parent join path
      _addRecAfter: function(rec, prevChild) {
         this._assertIsParent('_addRecAfter');
         var toY, len = this.sortedChildKeys.length, res = null;
         if( !prevChild || len === 0 ) {
            toY = 0;
         }
         else {
            toY = util.indexOf(this.sortedChildKeys, prevChild);
            if( toY === -1 ) {
               toY = len;
            }
            else {
               toY++;
            }
         }
         rec.prevChildName = toY > 0? this.sortedChildKeys[toY-1] : null;
         this.sortedChildKeys.splice(toY, 0, rec.name());
         if( toY < len ) {
            var nextKey = this.sortedChildKeys[toY+1];
            var nextRec = this._getJoinedChild(nextKey);
            nextRec.prevChildName = rec.name();
            if( this._isChildLoaded(nextRec) ) {
               res = this.triggerEvent('child_moved', makeSnap(nextRec), rec.name());
            }
         }
         return res;
      },

      // only applicable to the parent joined path
      _moveChildRec: function(rec, prevChild) {
         this._assertIsParent('_moveChildRec');
         if( this._isChildLoaded(rec) ) {
            var fromX = util.indexOf(this.sortedChildKeys, rec.name());

            if( fromX > -1 && prevChild !== undefined) {
               var toY = 0;
               if( prevChild !== null ) {
                  toY = util.indexOf(this.sortedChildKeys, prevChild);
                  if( toY === -1 ) { toY = this.sortedChildKeys.length }
               }

               if( fromX > toY ) {
                  toY++;
               }

               if( toY !== fromX ) {
//               log('Join::child_moved %s -> %s (%s)', rec.name(), prevChild, this);
                  this.sortedChildKeys.splice(toY, 0, this.sortedChildKeys.splice(fromX, 1));
                  rec.prevChildName = prevChild;
                  this._isChildLoaded(rec) && this.triggerEvent('child_moved', makeSnap(rec), prevChild);
                  this._setMyValue(join.sortSnapshotData(this, this.currentValue));
               }
            }
         }
      },

      // only applicable to child paths
      _myValueChanged: function() {
         join.buildSnapshot(this).value(function(snap) {
            this._setMyValue(snap.val());
         }, this);
      },

      /**
       * @param newValue
       * @returns {boolean}
       * @private
       */
      _setMyValue: function(newValue) {
         if( !util.isEqual(newValue, this.currentValue) ) {
            this.priorValue = this.currentValue;
            this.currentValue = newValue;
            this.joinedParent || this._loadCachedChildren();
            this.triggerEvent('value', makeSnap(this));
            return true;
         }
         return false;
      },

      _notifyExistingRecsAdded: function(obs) {
         this._assertIsParent('_notifyExistingRecsAdded');
         if( this.sortedChildKeys.length ) {
            /** @var {join.SnapshotBuilder} prev */
            var prev = null;
            util.each(this.sortedChildKeys, function(key) {
               if( this._isChildLoaded(key) ) {
                  var rec = this._getJoinedChild(key);
                  obs.notify(makeSnap(rec), prev);
                  prev = rec.name();
               }
            }, this);
         }
      },

      _eventTriggered: function(event, obsCount, snap, prevChild) {
         var fn = obsCount? log : log.debug;
         fn('"%s" (%s%s) sent to %d observers for JoinedRecord(%s)', event, snap.name(), prevChild? '->'+prevChild : '', obsCount, this.name());
         log.debug(snap.val());
      },

      _getJoinedChild: function(keyName) {
         return this.joinedParent? undefined : this.childRecs[keyName];
      },

      _loadCachedChildren: function() {
         this._assertIsParent('_loadCachedChildren');
         var prev = null;
//         this.sortedChildKeys = [];
         util.each(this.currentValue, function(v, k) {
            if( !this._isChildLoaded(k) ) {
               var rec = this.child(k);
               rec.currentValue = v;
               rec.prevChildName = prev;
               this._addChildRec(rec, rec.prevChildName);
            }
            prev = k;
         }, this);
      },

      _findFirebaseRefForChild: function(keyName) {
         var ref;
         // if this is the child of a join path, then its children are just regular Firebase refs
         // so we can just try to find the correct source for the key and call child() on that ref
         ref = util.find(this.paths, function(path) {
            return path.hasKey(keyName);
         });
         if( ref ) {
            ref = ref.child(keyName);
         }
         if( !ref ) {
            log.warn('Key "%s" not found in any of my joined paths (is it in your keyMap?); I am returning a child ref from the first joined path, which may not be what you wanted', keyName);
            ref = this.sortPath.ref().child(keyName);
         }
         return ref;
      },

      _assertIsParent: function(fnName) {
         if( this.joinedParent ) { throw new Error(fnName+'() should only be invoked for parent records'); }
      }
   };

   util.inherit(JoinedRecord, util.Observable);

   function eventsToMonitor(rec, path) {
      var events = [];
      if( !path.isDynamic() ) {
         if( path.isIntersection() || !rec.intersections.length ) {
            events.push('child_added');
         }
         if( path === rec.sortPath ) {
            events.push('child_moved');
         }
      }
      return events.length? events : null;
   }

   function makeSnap(rec, val) {
      if( arguments.length === 1 ) { val = rec.currentValue; }
      return new join.JoinedSnapshot(rec, val);
   }

   function buildPaths(rec, paths) {
      var builtPaths;
      if( paths[0] instanceof join.JoinedRecord ) {
         // occurs when loading child paths from a JoinedRecord, which
         // passes the parent JoinedRecord (paths[0]) and a key name (paths[1])
         rec.joinedParent = paths[0];
         builtPaths = util.map(rec.joinedParent.paths, function(parentPath) {
            return parentPath.childPath(rec, paths[1]);
         });
      }
      else {
         builtPaths = util.map(paths, function(props) {
            return props instanceof join.Path? props : new join.Path(props);
         });
      }
      return builtPaths;
   }

   function makeRefName(rec) {
      return rec.joinedParent? rec.sortPath.ref().name() : '['+util.map(rec.paths, function(p) { return p.name(); }).join('][')+']';
   }

   /** add JoinedRecord to package
     ***************************************************/
   join.JoinedRecord = JoinedRecord;

})(exports, fb);
