(function(exports, fb) {
   var undefined;
   var util = fb.pkg('util');
   var log  = fb.pkg('log');
   var join = fb.pkg('join');
   var EVENT_TYPES = ['child_added', 'child_removed', 'child_changed', 'child_moved', 'value'];

   function JoinedRecord() {
      this.joinedParent = null;
      this.paths = [];
      this.firstPath = null;
      this.sortPath = null;
      this.loadedChildRecs = {};
      this.sortedChildKeys = [];
      this.currentValue = null;
      this.prevChildName  = null;
      this.intersections = [];
      this.observedPaths = [];
      this.pathObserver = new util.Observer(EVENT_TYPES, this._pathNotification,  this);
      this._loadPaths(util.toArray(arguments));
   }

   util.inherit(JoinedRecord,
      new util.Observable(EVENT_TYPES),
      {
         auth: function(authToken, onComplete, onCancel) {
            return this.firstPath.ref().auth(authToken, onComplete, onCancel);
         },

         unauth: function() {
            return this.firstPath.ref().unauth();
         },

         on: function(eventType, callback, cancelCallback, context) {
            var obs = this.observe(eventType, callback, context, cancelCallback);
            if( eventType === 'value' ) {
               this._notifyWhenLoaded('value', obs);
            }
            else if( eventType === 'child_added' && this.sortedChildKeys.length ) {
               /** @var {join.SnapshotBuilder} prev */
               var prev = null;
               util.each(this.sortedChildKeys, function(key) {
                  var rec = this.loadedChildRecs[key];
                  // we load these in parallel, but we pass in prev on each iteration
                  // which allows them to make sure that the notifications are in order
                  prev = rec._notifyWhenLoaded(eventType, obs, prev);
               }, this);
            }
            this._monitorPaths();
         },

         off: function(eventType, callback, context) {
            this.stopObserving(eventType, callback, context);
            if( !this.hasAnyObservers() ) {
               this._stopMonitoringPaths();
            }
            return this;
         },

         once: function(eventType, callback, failureCallback, context) {},

         child: function(childPath) {
            var test, ref;
            var parts = childPath.split('/'), firstPart = parts.shift();
            test = this.loadedChildRecs[firstPart];
            if( test ) {
               // I already have this child record loaded so just return it
               ref = test;
            }
            else if( this.joinedParent ) {
               // if this is the child of a join path, then its children are just regular Firebase refs
               // so we can just try to find the correct source for the key and call child() on that ref
               test = util.find(this.paths, function(path) {
                  return path.hasKey(firstPart);
               });
               if( test ) {
                  ref = test.child(firstPart);
               }
               else {
                  log.warn('Key "%s" not found in any of my joined paths (is it in your keyMap?); I am returning a child ref from the first joined path, which may not be what you wanted', firstPart);
                  ref = this.firstPath.ref().child(firstPart);
               }
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
            return this.joinedParent || this.firstPath.ref().parent();
         },

         name: function() {
            return this.joinedParent? this.firstPath.ref().name() : '['+util.map(this.paths, function(p) { return p.name(); }).join('][')+']';
         },

         set:             function(value, onComplete) {},
         setWithPriority: function(value, priority, onComplete) {},
         setPriority:     function(priority, onComplete) {},
         update:          function(value, onComplete) {},
         remove:          function(onComplete) {},
         push:            function(value, onComplete) {},
         root:            function() { return this.firstPath.ref().root(); },

         toString: function() { return '['+util.map(this.paths, function(p) { return p.toString(); }).join('][')+']'; },

         ref:             function() { return this; },

         //////// methods that are not allowed
         onDisconnect:    function() { throw new Error('onDisconnect() not supported on JoinedRecord'); },
         limit:           function() { throw new Error('limit not supported on JoinedRecord; try calling limit() on ref before passing into Firebase.Util'); },
         endAt:           function() { throw new Error('endAt not supported on JoinedRecord; try calling endAt() on ref before passing into Firebase.Util'); },
         startAt:         function() { throw new Error('startAt not supported on JoinedRecord; try calling startAt() on ref before passing into Firebase.Util.join'); },
         transaction:     function() { throw new Error('transactions not supported on JoinedRecord'); },

         _monitorPaths: function() {
            if( util.isEmpty(this.observedPaths) ) {
               log('JoinedRecord(%s) has event listeners, connecting to Firebase', this);
               var paths = this.intersections.length? this.intersections : this.paths;
               util.each(paths, function(p) {
                  var events = eventsToMonitor(this, p);
                  if( events ) {
                     this.observedPaths.push(p);
                     util.each(events, function(e) {p.observe(e, this.pathObserver) }, this);
                  }
               }, this);
            }
         },

         _stopMonitoringPaths: function() {
            log('JoinedRecord(%s) has no event listeners, disconnecting from Firebase', this);
            util.call(this.observedPaths, 'stopObserving');
            this.observedPaths = [];
            util.each(this.loadedChildRecs, this._removeChildRec, this);
         },

         // this should never be called by a dynamic path, only by primary paths
         // that are controlling when a record gets created and processed
         _pathNotification: function(path, event, snap, prevChild) {
            log.debug('joined event received', event, path.toString(), snap.name(), path.getKeyMap());//debug

            if( event !== 'value' && this.hasAnyObservers(['value']/* excluding 'value' */) ) {
               var joinedEvent = determineJoinedEventName(this.loadedChildRecs[path.name()], path, snap, event);
               var childRef = this.child(snap.name());

               if( !this.joinedParent && isUnionPath(this.intersections, path) ) {
                  if( this.sortPath === path && prevChild !== undefined ) {
                     childRef.prevChildName = prevChild;
                     this._moveChildRec(childRef);
                  }
                  this._addChildRec(childRef);
               }


               //todo
               //todo fire child_removed and child_moved events as needed
               //todo
               //todo
               //todo
               //todo

               //todo
               //todo call _addChildRec and _removeChildRec
               //todo
               //todo
               //todo

               //todo
               //todo employ sort order and observe moved events for sortPath
               //todo
               //todo
               //todo
               join.buildSnapshot(childRef, function(joinedSnap) {
                  //todo
                  //todo
                  //todo
                  //todo
                  //todo
                  this._notifyAll(joinedEvent, joinedSnap);
               }, this);
            }

            if( this.hasObservers('value') ) {
               join.buildSnapshot(this, function(joinedSnap) {
                  if( !util.isEqual(joinedSnap.val(), this.currentValue) ) {
                     this.currentValue = joinedSnap.val();
                     this._notifyAll('value', joinedSnap);
                  }
               }, this);
            }
         },

         notifyCancelled: function() {}, // nothing to do, required by Observer interface

         _loadPaths: function(paths) {
            // used for inheritance when calling child() on a JoinedRecord
            if( paths[0] instanceof JoinedRecord ) {
               this.joinedParent = paths[0];
               util.each(this.joinedParent.paths, function(parentPath) {
                  // the child paths are merged as a union which is very appropriate
                  // for a child of the joined path where we'll want all the data, and not a subset
                  this._addPath(parentPath.childPath(this, paths[1]));
               }, this);
            }
            else {
               util.each(paths, this._addPath, this);
            }
            if( !this.firstPath ) {
               throw new Error('No valid Firebase refs provided (must provide at least one actual ref (i.e. non-function) argument');
            }
            if( !util.isEmpty(this.intersections) && !this.sortPath.isIntersection() ) {
               log.warn('Sort path cannot be set to a non-intersecting path as this makes no sense; using the first intersecting path instead');
               this.sortPath = this.firstPath;
            }
         },

         /**
          * @param {String} event
          * @param {Array} observers of join.Observer objects
          * @param {String|null|join.SnapshotBuilder} [prev]
          * @returns {*}
          * @private
          */
         _notifyWhenLoaded: function(event, observers, prev) {
            if( !util.isArray(observers) ) { observers = [observers]; }

            // start loading the snapshot right away
            var builder = join.buildSnapshot(this);
            var prevName = prev;

            function notifyAll(snap) {
               log.debug('notifyAll invoked', observers); //debug
               util.each(observers, function(obs) {
                  obs.notify(snap, prevName);
               });
            }

            if( prev instanceof join.SnapshotBuilder ) {
               // if we're chaining several records, wait for the prev record
               // to do it's magic before we send our notifications (so they
               // are sent in the same order Firebase would have sent
               // them if not joined)
               prevName = prev.ref().name();
               prev.value(function() {
                  builder.value(notifyAll);
               });
            }
            else {
               builder.value(notifyAll);
            }

            return builder;
         },

         _notifyAll: function(event, snap) {
            var prevName = util.contains(['child_added', 'child_moved'], event)? this.prevChildName : undefined;
            util.each(this.observers[event], function(obs) {
               obs.notify(snap, prevName);
            });
         },

         _addPath: function(pathProps) {
            var path = pathProps instanceof join.Path? pathProps : new join.Path(pathProps);
            this.paths.push(path);
            if( this.sortPath ) {
               path.props.setSortBy(false);
            }
            else if( path.isSortBy() ) {
               this.sortPath = path;
            }
            if(!this.firstPath && !path.isDynamic()) {
               this.firstPath = path;
            }
            if( path.isIntersection() ) {
               this.intersections.push(path);
            }
         },

         _addChildRec: function(rec) {
            if( !this.loadedChildRecs[rec.name()] ) {
               this.loadedChildRecs[rec.name()] = rec;
               rec.on('value', this._childValueChanged, this);
            }
         },

         _childValueChanged: function(snap) {
            //todo
            //todo
            //todo
            //todo
            //todo
            log.debug('_childValueChanged(%s, %s)', snap.name(), snap.val()); //debug
         },

         _moveChildRec: function(rec, prevChild) {
            //todo
            //todo
            //todo
            //todo
            //todo

            log.debug('_moveChildRec(%s, %s)', snap.name(), snap.val()); //debug
         },

         _removeChildRec: function(rec) {
            var i = util.indexOf(this.sortedChildKeys, rec.name());
            if( i > -1 ) {
               this.sortedChildKeys.splice(i, 1);
            }
            delete this.loadedChildRecs[rec.name()];
         }
      }
   );

   // Joined paths don't interpret add/remove/move on a single path quite the same
   // as a
   function determineJoinedEventName(currentChild, path, snap, event) {
      var joinedEvent = null;
      switch(event) {
         case 'child_added':
            if( !path.isDynamic() && snap.val() !== null ) {
               if( currentChild !== null ) {
                  joinedEvent = 'child_changed';
               }
               else {
                  joinedEvent = 'child_added';
               }
            }
            break;
         case 'child_changed':
            if( snap.val() === null ) {
               joinedEvent = 'child_removed';
            }
            else {
               joinedEvent = 'child_changed';
            }
            break;
         case 'child_removed':
            if( snap.val() === null ) {
               joinedEvent = 'child_removed';
            }
            else {
               joinedEvent = 'child_changed';
            }
            break;
         case 'child_moved':
            if( path.isSortBy() ) {
               joinedEvent = event;
            }
            break;
      }
      return joinedEvent;
   }

   function eventsToMonitor(rec, path) {
      var events = [];
      if( !path.isDynamic() ) {
         if( rec.joinedParent ) {
            events.push('value');
         }
         events.push('child_added');
         events.push('child_removed');
         if( path === rec.sortPath ) {
            events.push('child_moved');
         }
      }
      return events.length? events : null;
   }

   function isUnionPath(intersections, path) {
      return path.isIntersection() || (intersections.length === 0 && !path.isDynamic());
   }

   /** add JoinedRecord to package
     ***************************************************/
   join.JoinedRecord = JoinedRecord;

})(exports, fb);
