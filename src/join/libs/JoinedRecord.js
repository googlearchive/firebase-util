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
      this.priorValue = undefined;
      this.currentValue = undefined;
      this.prevChildName  = null;
      this.intersections = [];
      this._loadPaths(util.toArray(arguments));
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
            if( this.currentValue !== undefined ) {
               obs.notify(makeSnap(this));
            }
            else {
               this._myValueChanged();
            }
         }
         else if( eventType === 'child_added' ) {
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
         this.observe(eventType, function(snap, prevChild) {
            this.stopObserving(eventType, callback, context);
            callback.call(context, snap, prevChild);
         }, context, failureCallback);
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
         return this.joinedParent? this.sortPath.ref().name() : '['+util.map(this.paths, function(p) { return p.name(); }).join('][')+']';
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

      _monitorEvent: function(eventType) {
         if( this.getObservers(eventType).length === 1 ) {
            var paths;
            log('JoinedRecord(%s) now has observers for "%s"', this, eventType);
            if( this.joinedParent ) {
               paths = this.paths;
               util.call(paths, 'observe', eventType, this._pathNotification, this);
            }
            else if( this.getObservers().length === 1 ) {
               log.info('My first observer attached, loading my data and Firebase connections');
               paths = this.intersections.length? this.intersections : this.paths;
               this.pathLoader.done(function() {
                  // this is the first observer, so start up our path listeners
                  util.each(paths, function(path) {
                     path.observe(eventsToMonitor(this, path), this._pathNotification, this);
                  }, this);
               }, this);
            }
         }
      },

      _stopMonitoringEvent: function(eventType) {
         if( !this.hasObservers(eventType) ) {
            log('JoinedRecord(%s) has no more observers%s', this, eventType? 'for "'+eventType+'"' : '');
            if( this.joinedParent ) {
               util.call('paths', 'stopObserving', eventType, this._pathNotification, this);
            }
            else if( !this.hasObservers() ) {
               log.info('My last observer detached, releasing my data and Firebase listeners');
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
      },

      // this should never be called by a dynamic path, only by primary paths
      // that are controlling when a record gets created and processed
      _pathNotification: function(path, event, childName, mappedVals, prevChild, childSnap) {
         var rec;
         log.debug('Received "%s" from Path(%s): %j', event, path.toString(), this.joinedParent? mappedVals:childSnap.val());

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
                     this._addChildRec(path, rec, prevChild);
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
               log.warn('Sort path cannot be set to a non-intersecting path as this makes no sense; using the first intersecting path instead');
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

      // only applicable to the parent joined path
      _addChildRec: function(path, rec, prevName) {
         rec.once('value', function(snap) {
            if( snap.val() !== null ) {
               if( !this._isChildLoaded(rec.name()) ) {
                  this._sortRecAfter(rec, prevName);
                  this.childRecs[rec.name()] = rec;
                  this._setMyValue(join.sortSnapshotData(this, this.currentValue, snap));
                  this.triggerEvent('child_added', makeSnap(rec));
                  this.triggerEvent('value', makeSnap(this));
                  rec.on('value', this._updateChildRec, this);
               }
               else if( path === this.sortPath ) {
                  this._moveChildRec(rec, prevName);
               }
            }
         }, this);
         return rec;
      },

      // only applicable to the parent join path
      _removeChildRec: function(rec) {
         var childName = rec.name();
         rec.stopObserving(null, this._updateChildRec, this);
         if( this._isChildLoaded(rec) ) {
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
            if( util.isObject(this.currentValue) ) {
               delete this.currentValue[childName];
            }
            this.triggerEvent('child_removed', makeSnap(rec, rec.priorValue));
            this.triggerEvent('value', makeSnap(this));
         }
         return rec;
      },

      // only applicable to the parent join path
      _updateChildRec: function(snap) {
         if( snap.val() === null ) {
            this._removeChildRec(snap.ref());
         }
         else {
            if( !util.isObject(this.currentValue) || !snap.isEqual(this.currentValue[snap.name()]) ) {
               this._setMyValue(join.sortSnapshotData(this, this.currentValue, snap));
               this.triggerEvent('child_changed', snap);
               this.triggerEvent('value', makeSnap(this));
            }
         }
      },

      // only applicable to parent join path
      _sortRecAfter: function(rec, prevChild) {
         var toY, len = this.sortedChildKeys.length;
         if( !prevChild || len === 0 ) {
            toY = 0;
         }
         else {
            toY = util.indexOf(this.sortedChildKeys, prevChild);
            if( toY === -1 ) {
               toY = len;
            }
         }
         rec.prevChildName = toY > 0? this.sortedChildKeys[toY-1] : null;
         this.sortedChildKeys.splice(toY, 0, rec.name());
         if( toY < len ) {
            var nextKey = this.sortedChildKeys[toY+1];
            var nextRec = this._getJoinedChild(nextKey);
            nextRec.prevChildName = rec.name();
            this._isChildLoaded(nextRec) && this.triggerEvent('child_moved', makeSnap(nextRec), rec.name());
         }
      },

      // only applicable to the parent joined path
      _moveChildRec: function(rec, prevChild) {
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
               this.triggerEvent('value', makeSnap(this));
            }
         }
      },

      // only applicable to child paths
      _myValueChanged: function() {
         this.pathLoader.done(function() {
            join.buildSnapshot(this).value(function(snap) {
               log('_myValueChanged', snap.val()); //debug
               if( this._setMyValue(snap.val()) ) {
                  this._loadCachedChildren();
                  this.triggerEvent('value', makeSnap(this));
               }
            }, this);
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
            return true;
         }
         return false;
      },

      _notifyExistingRecsAdded: function(obs) {
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

      _eventTriggered: function(event, observers, snap, prevChild) {
         var fn = observers.length? log : log.debug;
         fn('Join::%s(%s%s) sent to %d observers by %s', event, snap.name(), prevChild? '->'+prevChild : '', observers.length, this);
         log.debug(snap.val());
      },

      _getJoinedChild: function(keyName) {
         return this.joinedParent? undefined : this.childRecs[keyName];
      },

      _loadCachedChildren: function() {
         if( !this.joinedParent && this.priorValue === undefined ) {
            var prev = null, loaded = [];
            this.sortedChildKeys = [];
            util.each(this.currentValue, function(v, k) {
               if( !this._isChildLoaded(k) ) {
                  var rec = this.child(k);
                  rec.currentValue = v;
                  rec.prevChildName = prev;
                  this.sortedChildKeys.push(k);
                  this.childRecs[k] = rec;
                  loaded.push(rec);
               }
               prev = k;
            }, this);
            util.each(loaded, function(rec) {
               this.triggerEvent('child_added', makeSnap(rec), rec.prevChildName);
            }, this);
         }
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

   /** add JoinedRecord to package
     ***************************************************/
   join.JoinedRecord = JoinedRecord;

})(exports, fb);
