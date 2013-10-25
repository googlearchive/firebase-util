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
      log('JoinedRecord', this._observableProps.onEvent);//debug
      this.joinedParent = null;
      this.paths = [];
      this.sortPath = null;
      this.loadedChildRecs = {};
      this.sortedChildKeys = [];
      this.priorValue = undefined;
      this.currentValue = undefined;
      this.prevChildName  = null;
      this.intersections = [];
      this.pathsLoadedCallbacks = [];
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
            this._triggerWhenLoaded('value', obs);
         }
         else if( eventType === 'child_added' ) {
            this._notifyExistingRecsAdded(obs);
         }
      },

      off: function(eventType, callback, context) {
         this.stopObserving(eventType, callback, context);
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
               ref = this.sortPath.ref().child(firstPart);
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
            log.debug('JoinedRecord(%s) now has listeners for "%s"', this, eventType);
            if( this.getObservers().length === 1 ) {
               this.pathLoader.done(function() {
                  // this is the first observer, so start up our path listeners
                  var paths = this.intersections.length? this.intersections : this.paths;
                  util.each(paths, function(path) {
                     path.observe(eventsToMonitor(this, path), this._pathNotification, this);
                  }, this);
               }, this);
            }
         }
      },

      _stopMonitoringEvent: function(eventType) {
         if( !this.hasObservers(eventType) ) {
            log.debug('JoinedRecord(%s) has no more listeners%s', this, eventType? 'for "'+eventType : '"');
            if( !this.hasAnyObservers() ) {
               // nobody is monitoring this event anymore, so we'll stop monitoring the path now
               var paths = this.intersections.length? this.intersections : this.paths;
               util.each(paths, this._removeChildRec, this);
               util.call(this.paths, 'stopObserving');
               this.currentValue = undefined;
            }
         }
      },

      // this should never be called by a dynamic path, only by primary paths
      // that are controlling when a record gets created and processed
      _pathNotification: function(path, event, childName, mappedVals, prevChild) {
         var rec, self = this;
         log.debug('Received "%s" event from Path(%s/%s): %j', event, path.toString(), childName, mappedVals);//debug

         if( this.joinedParent ) {
            // most of the child record events are just pretty much a passthrough
            switch(event) {
               case 'value':
                  this._myValueChanged(path.getKeyMap(), mappedVals);
                  break;
               default:
                  log.error('I cannot proccess "%s" yet :(');
                  //todo
                  //todo
                  //todo
                  //todo
                  //todo
            }
         }
         else {
            rec = this.child(childName);
            switch(event) {
               case 'child_added':
                  if( mappedVals !== null ) {
                     if( !this._isChildLoaded(childName) ) {
                        rec._triggerWhenLoaded('child_added', function(snap, prevName) {
                           self._addChildRec(rec, prevName);
                        }, prevChild);
                     }
                     else if( path === this.sortPath && prevChild !== rec.prevChildName ) {
                        this._moveChildRec(rec, prevChild);
                     }
                  }
                  break;
               case 'child_moved':
                  if( this.sortPath === path && this._isChildLoaded(childName) ) {
                     this._moveChildRec(rec, prevChild);
                     this.triggerEvent('child_moved', rec._snap(), prevChild||null);
                  }
                  break;
            }
         }
      },

      notifyCancelled: function() {}, // nothing to do, required by Observer interface

      _isChildLoaded: function(key) {
         if( util.isObject(key) ) { key = key.name(); }
         return this.loadedChildRecs.hasOwnProperty(key) && this.loadedChildRecs[key].currentValue !== undefined;
      },

      // must be called before any on/off events
      _loadPaths: function(paths) {
         this.pathLoader = new join.PathLoader(this, paths);
         if( this.sortPath ) {
            if( !util.isEmpty(this.intersections) && !this.sortPath.isIntersection() ) {
               log.warn('Sort path cannot be set to a non-intersecting path as this makes no sense; using the first intersecting path instead');
               this.sortPath = this.intersections[0];
            }
         }
         else {
            this.sortPath = util.isEmpty(this.intersections)? this.paths[0] : this.intersections[0];
         }

         if( !this.sortPath ) {
            throw new Error('No valid Firebase refs provided (must provide at least one actual Firebase ref');
         }
      },

      // must be called before any on/off events
      _addPath: function(pathProps) {
         var path = pathProps instanceof join.Path? pathProps : new join.Path(pathProps);
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
      },

      _triggerIfChanged: function(event) {
         this._triggerWhenLoaded(event, function(snap) {
            if( shouldNotify(event, snap, this.priorValue) ) {
               this.triggerEvent(event, snap);
            }
         })
      },

      /**
       * A utility that ensures child paths have loaded all their join components before triggering
       * any event notifications. It can handle chaining by providing a prev object value() function (see SnapshotBuilder)
       *
       * @param {String} event
       * @param {Array|Object|Function} observer of join.Observer objects
       * @param {String|null|Object} [afterThisRec]
       * @returns {*}
       * @private
       */
      _triggerWhenLoaded: function(event, observer, afterThisRec) {
         if( !util.isArray(observer) ) { observer = [observer]; }
         var prevName, self = this;
         var childKeys = this.sortedChildKeys;
         var builder = join.buildSnapshot(this);

         this.pathLoader.done(function() {
            if( util.isObject(afterThisRec) ) {
               // if we're chaining several records, wait for the prev record
               // to do it's magic before we send our notifications (so they
               // are sent in the same order Firebase would have sent
               // them if not joined)
               this.prevChildName = afterThisRec.ref().name();
               afterThisRec.value(function() {
                  builder.value(notifyAll);
               });
            }
            else {
               builder.value(notifyAll);
            }
         }, this);


         function notifyAll(snap) {
//            log('JoinedRecord(%s) loaded', this);
            if( util.has(['child_added', 'child_moved'], event) ) {
               prevName = snap.ref().prevChildName;
               if( util.indexOf(childKeys, prevName) === - 1 ) {
                  prevName = childKeys[childKeys.length-1] || null;
               }
            }
            util.each(observer, function(obs) {
               if( typeof(obs) === 'function' ) {
                  obs(snap, prevName);
               }
               else {
                  obs.notify(snap, prevName);
               }
            });
         }

         return builder;
      },

      _notifyAll: function(event, snap) {
         var prevName = util.contains(['child_added', 'child_moved'], event)? this.prevChildName : undefined;
         util.each(this.observers[event], function(obs) {
            obs.notify(snap, prevName);
         });
      },

      // only applicable to the parent joined path
      _addChildRec: function(rec, prevName) {
         if( !this.loadedChildRecs[rec.name()] ) {
            rec._triggerWhenLoaded('child_added', util.bind(function() {
               log.debug('JoinedRecord::child_added %s', rec);
               this._sortRecAfter(rec, prevName);
               this._setMyValue(this.currentValue, rec);
               rec.on('value', this._updateChildRec, this);
            }, this));
         }
         return rec;
      },

      // only applicable to the parent join path
      _removeChildRec: function(rec) {
         if( this._isChildLoaded(rec) ) {
            log.debug('JoinedRecord::child_removed %s', rec);
            var i = util.indexOf(this.sortedChildKeys, rec.name());
            rec.off('value', this._updateChildRec, this);
            if( i > -1 ) {
               this.sortedChildKeys.splice(i, 1);
            }
            delete this.loadedChildRecs[rec.name()];
            if( util.isObject(this.currentValue) ) {
               delete this.currentValue[rec.name()];
            }
            this.triggerEvent('child_removed', snap(rec, rec.priorValue));
         }
         return rec;
      },

      // only applicable to the parent join path
      _updateChildRec: function(snap) {
         if( snap.val() === null ) {
            this._removeChildRec(snap.ref());
         }
         else {
            log.debug('JoinedRecord::child_changed %s)', snap.ref());
            if( !util.isObject(this.currentValue) ) {
               this.currentValue = {};
            }
            this.currentValue[snap.name()] = snap.val();
            this.triggerEvent('child_changed', snap);
         }
      },

      // only applicable to parent join path
      _sortRecAfter: function(rec, prevChild) {
         var toY, len = this.sortedChildKeys.length;
         if( prevChild === null || len === 0 ) {
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
            var nextRec = this.loadedChildRecs[nextKey];
            nextRec.prevChildName = rec.name();
            this._isChildLoaded(nextRec) && this.triggerEvent('child_moved', snap(nextRec), rec.name());
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
               log.debug('JoinedRecord::child_moved %s -> %s', rec.name(), prevChild);
               this.sortedChildKeys.splice(toY, 0, this.sortedChildKeys.splice(fromX, 1));
               rec.prevChildName = prevChild;
               this._isChildLoaded(rec) && this.triggerEvent('child_moved', snap(rec), prevChild);
               this._setMyValue(this.currentValue);
            }
         }
      },

      // only applicable to child paths
      _myValueChanged: function(keyMap, mappedVals) {
         var newValue = mergeIntoVal(keyMap, this.currentValue, mappedVals);
         if( this._setMyValue(newValue) ) {
            this.triggerEvent('value', snap(this));
         }
      },

      /**
       * @param newValue
       * @param [newRec]
       * @returns {boolean}
       * @private
       */
      _setMyValue: function(newValue, newRec) {
         log('_setMyValue', newValue); //debug
         newValue = JoinedRecord.sortData(this, newValue, newRec);
         if( !util.isEqual(newValue, this.currentValue) ) {
            log('_setMyValue', newValue); //debug
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
               var rec = this.loadedChildRecs[key];
               // we load these in parallel, but we pass in prev on each iteration
               // which allows them to make sure that the notifications are in order
               prev = rec._triggerWhenLoaded('child_added', obs, prev);
            }, this);
         }
      },

      _eventTriggered: function(event, args) {
         log('_eventTriggered!!!!!!!!!!!!!!', event, args);
         event !== 'value' && this._triggerIfChanged('value');
      }
   };

   util.inherit(JoinedRecord, util.Observable);

   /**
    * @param {JoinedRecord} rec
    * @param {Object} data
    * @param {JoinedRecord} [addChildRec]
    * @returns {*}
    */
   JoinedRecord.sortData = function(rec, data, addChildRec) {
      var out = data;
      if( util.isObject(data) ) {
         out = {};
         if( rec.joinedParent ) {
            util.each(rec.paths, function(path) {
               util.each(path.getKeyMap(), function(key) {
                  util.isEmpty(data[key]) || (out[key] = data[key]);
               });
            });
         }
         else {
            util.each(rec.sortedChildKeys, function(key) {
               if( addChildRec && addChildRec.name() === key ) {
                  out[key] = addChildRec;
               }
               else if( !util.isEmpty(data[key]) ) {
                  out[key] = data[key];
               }
            });
         }
      }
      return util.isEmpty(out)? null : out;
   };

   function eventsToMonitor(rec, path) {
      var events = [];
      if( !path.isDynamic() ) {
         if( path.isIntersection() || !rec.intersections.length ) {
            events.push('child_added');
         }
         if( rec.joinedParent ) {
            events.push('value');
            events.push('child_removed');
         }
         if( path === rec.sortPath ) {
            events.push('child_moved');
         }
      }
      return events.length? events : null;
   }

   function mergeIntoVal(keyMap, oldValue, mappedVals) {
      var processingValue = util.extend({}, oldValue);
      util.each(keyMap, function(key) {
         if( util.isEmpty(mappedVals[key]) ) {
            delete processingValue[key];
         }
         else {
            processingValue[key] = mappedVals[key];
         }
      });
      return util.isEmpty(processingValue)? null : processingValue;
   }

   function pick(obj, keys) {
      var out = {};
      if( !util.isEmpty(obj) ) {
         if( util.isObject(obj) ) {
            util.each(keys, function(key) {
               util.isEmpty(obj[key]) || (out[key] = obj[key]);
            });
         }
         else if(keys['.value'] ) {
            out[keys['.value']] = obj;
         }
      }
      return out;
   }

   function snap(rec, val) {
      if( arguments.length === 1 ) { val = rec.currentValue; }
      return new join.JoinedSnapshot(rec, val);
   }

   function shouldNotify(event, snap, priorValue) {
      var res = true;
      switch(event) {
         case 'child_added':
            if( snap.val() === null ) { res = false; }
            break;
         case 'value':
            if( snap.val() === priorValue ) { res = false; }
            break;
         default:
            // nothing to do
      }
      return res;
   }

   /** add JoinedRecord to package
     ***************************************************/
   join.JoinedRecord = JoinedRecord;

})(exports, fb);
