(function (fb) {
   "use strict";
   var undefined;
   var log  = fb.pkg('log');
   var util = fb.pkg('util');
   var join = fb.pkg('join');
   var EVENTS = ['child_added', 'child_removed', 'child_moved', 'child_changed', 'value', 'keyMapLoaded', 'dynamicKeyLoaded'];

   /** PATH
    ***************************************************
    * @private
    * @constructor
    */
   function Path(props, parent) {
      this._super(this, EVENTS, util.bindAll(this, {
         onAdd: this._observerAdded,
         onRemove: this._observerRemoved,
         oneTimeEvents: ['keyMapLoaded', 'dynamicKeyLoaded']
      }));
      this.subs = [];
      this.parentPath = parent;
      this.props = buildPathProps(props, parent);
      // map of dynamic fields that have to be loaded separately, see _buildKeyMap() and _parseData()
      this.dynamicChildPaths = null;
      if( !this.props.pathName ) {
         throw new Error('No pathName found; path cannot be set to Firebase root');
      }
      this._buildKeyMap(parent);
      this._initDynamicSource();
   }

   Path.prototype = {
      child: function(aliasedKey) {
         var sourceKey = this.isJoinedChild()? this.sourceKey(aliasedKey) : aliasedKey;
         if( this.hasDynamicChild(sourceKey) ) {
            throw new Error('Cannot use child() to retrieve a dynamic keyMap ref; try loadChild() instead');
         }
         if( sourceKey === undefined ) {
            log.info('Path(%s): Asked for child key "%s"; it is not in my key map', this.name(), aliasedKey);
            sourceKey = aliasedKey;
         }
         if( sourceKey === '.value' ) {
            return this;
         }
         else {
            return new Path(this.ref().child(sourceKey), this);
         }
      },

      /**
       * @param {Firebase} sourceRef path where the dynamic key's value is kept
       * @param {String} aliasedKey name of the key where I put my data
       * @returns {Path}
       */
      dynamicChild: function(sourceRef, aliasedKey) {
         return new Path({
            ref: this.ref(true),
            dynamicSource: sourceRef,
            keyMap: {'.value': aliasedKey},
            sync: this.props.sync
         }, this);
      },

      name: function() { return this.isDynamic()? this.props.pathName+'/'+(this.props.dynamicKey||'<dynamic>') : this.props.pathName; },
      toString: function() { return this.ref()? this.ref().toString() : this.props.ref.toString()+'/<dynamic>'; },

      loadData: function(doneCallback, context) {
         util.defer(function() {
            if( !this.isReadyForOps() ) {
               log.debug('Path(%s) loadData() called but dynamic key has not loaded yet; waiting for dynamicKeyLoaded event', this.name());
               this._waitForReady(doneCallback, context);
            }
            else {
               this.ref(true).once('value', function(snap) {
                  if( this.isJoinedChild() ) {
                     this._parseRecord(snap, doneCallback, context);
                  }
                  else {
                     this._parseRecordSet(snap, doneCallback, context);
                  }
               }, this)
            }
         }, this);
      },

      /**
       * @param data
       * @param callback
       * @param [priority]
       */
      pickAndSet: function(data, callback, priority) {
         if( this.isDynamic() ) {
            log.debug('Path(%s) is dynamic (ready only), so pickAndSet was ignored', this.name());
            callback(null);
         }
         else {
            if( data === null ) {
               this.ref().remove(callback);
            }
            else {
               var finalDat = this._dataForSetOp(data);
               if( this.isSortBy() && priority !== undefined ) {
                  this.ref().setWithPriority(finalDat, priority, callback);
               }
               else {
                  this.ref().set(finalDat, callback);
               }
            }
         }
      },

      pickAndUpdate: function(data, callback) {
         if( !util.isObject(data) ) {
            throw new Error('Update failed: First argument must be an object containing the children to replace.');
         }
         if( this.isDynamic() ) {
            log.debug('Path(%s) is dynamic (ready only), so pickAndUpdate was ignored', this.name());
            callback(null);
         }
         else {
            var finalDat = this._dataForSetOp(data, true);
            if( util.isEmpty(finalDat) ) {
               callback(null);
            }
            else if( this.isPrimitive() ) {
               this.ref().set(finalDat, callback);
            }
            else {
               this.ref().update(finalDat, callback);
            }
         }
      },

      remove: function(cb) { this.ref().remove(cb); },

      isIntersection: function() { return this.props.intersects; },
      isSortBy: function() { return this.props.sortBy; },
      setSortBy: function(b) { this.props.sortBy = b; },

      /**
       * @param {bool} [queryRef]
       */
      ref: function(queryRef) {
         var ref = null;
         if( this.isDynamic() ) {
            if( this.isReadyForOps() ) {
               ref = this.props.ref.child(this.props.dynamicKey);
            }
         }
         else {
            ref = this.props.ref;
         }
         return ref && !queryRef? ref.ref() : ref;
      },

      hasKey: function(aliasedKey) {
         return util.contains(this.getKeyMap(), aliasedKey);
      },

      sourceKey: function(aliasedKey) {
         var res = aliasedKey;
         if( this.isJoinedChild() ) {
            util.find(this.props.keyMap, function(v,k) {
               var isMatch = v === aliasedKey;
               if(isMatch) {
                  res = k;
               }
               return isMatch;
            });
         }
         return res;
      },
      aliasedKey: function(sourceKey) {
         return this.getKeyMap()[sourceKey];
      },

      isJoinedChild: function() { return !!this.parentPath; },

      isPrimitive: function() {
         return util.has(this.getKeyMap(), '.value') && this.isJoinedChild();
      },

      /**
       * Removes a key which exists in two paths. See the reconcilePaths() method in PathLoader.js
       * @param {string} sourceKey
       * @param {Path} owningPath
       */
      removeConflictingKey: function(sourceKey, owningPath) {
         log('Path(%s) cannot use key %s->%s; that destination field is owned by Path(%s). You could specify a keyMap and map them to different destinations if you want both values in the joined data.', this, sourceKey, this.getKeyMap()[sourceKey], owningPath);
         delete this.props.keyMap[sourceKey];
      },

      /**
       * Removes a dynamic key which is going to be assigned as its own path. But keeps track of it so any
       * .id: values will be processed accordingly.
       * @param {string} sourceKey
       */
      suppressDynamicKey: function(sourceKey) {
         this.props.dynamicAbstracts[sourceKey] = this.aliasedKey(sourceKey);
         delete this.props.keyMap[sourceKey];
      },

      /**
       * Unless keyMap is passed in the config, it will be empty until the first data set is fetched!
       * @returns {Object} a hash
       */
      getKeyMap: function() {
         return this.props.keyMap || {};
      },

      /**
       * Iterate each key in this keyMap and call the iterator with args: sourceKey, aliasedKey, value
       * The value is obtained using an aliasedKey from data (which must be an object, primitives should use
       * the aliased key or .value). Dynamic keyMap refs return the id value (not the dynamic data).
       *
       * @param data
       * @param iterator
       * @param [context]
       */
      eachKey: function(data, iterator, context) {
         this._iterateKeys(data, iterator, context, false);
      },

      /**
       * Iterate each key in this keyMap and call the iterator with args: sourceKey, aliasedKey, value
       * The value is obtained using an sourceKey from data (which must be an object, primitives should use
       * the aliased key or .value). Dynamic keyMap refs return the id value (not the dynamic data).
       *
       * @param data
       * @param iterator
       * @param [context]
       */
      eachSourceKey: function(data, iterator, context) {
         this._iterateKeys(data, iterator, context, true);
      },

      getDynamicPaths: function() {
         return this.dynamicChildPaths;
      },

      equals: function(path) {
         return this.isReadyForOps() && path.toString() === this.toString();
      },

      _dataForSetOp: function(data, updatesOnly) {
         var finalDat;
         if( this.isJoinedChild() ) {
            finalDat = this._pickMyData(data, updatesOnly);
         }
         else {
            finalDat = util.mapObject(data, function(rec) {
               return this._pickMyData(rec, updatesOnly);
            }, this);
         }
         return finalDat;
      },

      /**
       * Given a set of keyMapped data, return it to the raw format usable for use in my set/update
       * functions. Dynamic keyMap values are excluded.
       *
       * @param data
       * @param {boolean} updatesOnly only include keys in data, no nulls for other keymap entries
       * @private
       */
      _pickMyData: function(data, updatesOnly) {
         var out = {};
         this.eachKey(data, function(sourceKey, aliasedKey, value, dynKey) {
            if( !updatesOnly || (dynKey && util.has(data, dynKey)) || (!dynKey && util.has(data, aliasedKey)) ) {
               out[sourceKey] = value;
            }
         });
         return util.isEmpty(out)? null : util.has(out, '.value')? out['.value'] : out;
      },

      _observerAdded: function(event) {
         if( this.isOneTimeEvent(event) ) { return; }
         log('Path(%s) Added "%s" observer, %d total', event, this.name(), this.getObservers(event).length);
         if( !this.subs[event] ) {
            this._startObserving(event);
            if( this.isDynamic() && this.getObservers(util.keys(this.subs)).length === 1 ) {
               this._watchDynamicSource();
            }
         }
      },

      _observerRemoved: function(event, obsList) {
         if( this.isOneTimeEvent(event) ) { return; }
         obsList.length && log('Path(%s) Removed %d observers of "%s", %d remaining', event, obsList.length, this.name(), this.getObservers(event).length);
         if( !this.hasObservers(event) && this.subs[event] ) {
            this._stopObserving(event);
            delete this.subs[event];
            if( this.isDynamic() && !this.hasObservers(util.keys(this.subs)) ) {
               this._unwatchDynamicSource();
            }
         }
      },

      _sendEvent: function(event, snap, prevChild) {
         if( event === 'value' ) {
            this.loadData(fn, this);
         }
         else if( !this.isJoinedChild() ) {
            // the snapshot may contain keys we don't want or they could reference dynamic paths
            // so the simplest solution here is to get the child path and load the data from there
            this.child(snap.name()).loadData(fn, this);
         }
         else if( this.hasKey(snap.name()) ) {
            // the hasKey here is critical because we only trigger events for children
            // which are part of our keyMap on the child records (the joined parent gets all, of course)
            fn.call(this, snap.val());
         }

         function fn(data) {
            if( data !== null || util.contains(['child_removed', 'value'], event) ) {
               log.debug('Path(%s)::sendEvent(%s, %s) to %d observers', this.name(), event, snap.name()+(prevChild !== undefined? '->'+prevChild : ''), this.getObservers(event).length, data);
               this.triggerEvent(event, this, event, snap.name(), data, prevChild, snap.getPriority());
            }
         }
      },

      isDynamic: function() {
         return !!this.props.dynamicSource;
      },

      isReadyForOps: function() {
         return !this.isDynamic() || !util.isEmpty(this.props.dynamicKey);
      },

      hasDynamicChild: function(sourceKey) {
         return util.has(this.dynamicChildPaths, sourceKey);
      },

      isReadOnly: function() {
         return this.props.readOnly;
      },

      _buildKeyMap: function(parent) {
         if( parent && !parent.isJoinedChild() ) {
            this.props.intersects = parent.isIntersection();
         }
         join.getKeyMapLoader(this, parent).done(function(readOnly, parsedKeyMap, dynamicChildPaths) {
            if( util.isEmpty(parsedKeyMap) ) {
               log.warn('Path(%s) contains an empty keyMap', this.name());
            }
            if( readOnly ) {
               log.info('Path(%s) no keyMap specified and could not find data at path "%s", this data is now read-only!', this.name(), this.toString());
            }
            this.props.readOnly = readOnly;
            this.props.keyMap = parsedKeyMap;
            this.dynamicChildPaths = dynamicChildPaths;
            this.observeOnce('dynamicKeyLoaded', function() {
               log.debug('Path(%s) finished keyMap: %j', this.toString(), this.getKeyMap());
               this.triggerEvent('keyMapLoaded', parsedKeyMap);
            }, this);
         }, this);
      },

      _parseRecordSet: function(parentSnap, callback, scope) {
         var out = {}, self = this;
         var q = util.createQueue();
         parentSnap.forEach(function(recSnap) {
            var aliasedKey = recSnap.name();
            out[aliasedKey] = null; // placeholder to enforce ordering
            q.addCriteria(function(cb) {
               self._parseRecord(recSnap, function(childData) {
                  if( childData === null ) {
                     delete out[aliasedKey];
                  }
                  else {
                     out[aliasedKey] = childData;
                  }
                  cb();
               })
            })
         });
         q.done(function() {
            if( util.isEmpty(out) ) { out = null; }
            log.debug('Path(%s) _parseRecordSet: %j', self.name(), out);
            callback.call(scope, out, parentSnap);
         });
      },

      _parseRecord: function(snap, callback, scope) {
         var out = null, q = util.createQueue();
         var data = snap.val();
         if( data !== null ) {
            if( this.isPrimitive() ) {
               out = data;
            }
            else {
               out = {};
               this.eachSourceKey(data, util.bind(this._parseValue, this, q, out, snap));
            }
         }
         q.done(function() {
            out = parseValue(out);
//            log('Path(%s) _parseRecord %s: %j', this.name(), snap.name(), out);
            callback.call(scope, out, snap);
         }, this);
         return callback;
      },

      _parseValue: function(queue, out, snap, sourceKey, aliasedKey, value) {
         if( value !== null ) {
            if( this.hasDynamicChild(sourceKey) ) {
               out[aliasedKey] = null; // placeholder for sorting
               out['.id:'+aliasedKey] = value;
               queue.addCriteria(function(cb) {
                  this._parseDynamicChild(snap, sourceKey, aliasedKey,
                     function(dynData) {
                        if( dynData === null ) {
                           delete out[aliasedKey];
                        }
                        else {
                           out[aliasedKey] = dynData;
                        }
                        cb();
                     });
               }, this);
            }
            else {
               out[aliasedKey] = value;
            }
         }
      },

      _parseDynamicChild: function(snap, sourceKey, aliasedKey, cb) {
         var sourceRef = snap.ref().child(sourceKey);
         var path = this.dynamicChildPaths[sourceKey].dynamicChild(sourceRef, aliasedKey);
         path.loadData(cb);
      },

      /**
       * @param data the data to be iterated
       * @param {Function} callback
       * @param {Object} [context]
       * @param {boolean} [useSourceKey] if true, this is inbound data for Firebase, otherwise, its snapshot data headed out
       * @private
       */
      _iterateKeys: function(data, callback, context, useSourceKey) {
         var args = util.Args('_iterateKeys', Array.prototype.slice.call(arguments), 2, 4).skip();
         callback = args.nextReq('function');
         context = args.next('object');
         useSourceKey = args.next('boolean');

         var map = this.getKeyMap();
         if( useSourceKey && map['.value'] ) {
            callback.call(context, '.value', map['.value'], data);
         }
         else {
            util.each(map, function(aliasedKey, sourceKey) {
               var val = getFirebaseValue(this, data, sourceKey, aliasedKey, useSourceKey);
               callback.call(context, sourceKey, aliasedKey, val);
            }, this);

            if( !useSourceKey ) {
               // At the record level, dynamic keys are converted into their own paths. While this greatly
               // simplifies the read process, writing the keys back into the data requires this additional
               // step to make sure they are added to my data before set() or update() is called
               util.each(this.props.dynamicAbstracts, function(aliasedKey, sourceKey) {
                  var dynKey = '.id:'+aliasedKey;
                  callback.call(context, sourceKey, aliasedKey, util.has(data, dynKey)? data[dynKey] : null, dynKey);
               });
            }
         }
      },

      _initDynamicSource: function() {
         if( this.isDynamic() ) {
            var ref = this.props.dynamicSource;
            ref.once('value', this._dynamicSourceEvent, function(err) {
               console.error('Could not access dynamic source path', ref.toString());
               this.abortObservers(err);
            }, this);
         }
         else {
            this.triggerEvent('dynamicKeyLoaded', undefined);
         }
      },

      _watchDynamicSource: function() {
         if( this.isDynamic() ) {
            var ref = this.props.dynamicSource;
            ref.on('value', this._dynamicSourceEvent, function(err) {
               console.error('Lost access to my dynamic source path', ref.toString());
               this.abortObservers(err);
            }, this);
         }
      },

      _unwatchDynamicSource: function() {
         if( this.isDynamic() ) {
            this.props.dynamicSource.off('value', this._dynamicSourceEvent, this);
         }
      },

      _dynamicSourceEvent: function(snap) {
         this._observeNewSourcePath(snap.val());
      },

      _observeNewSourcePath: function(pathKey) {
         if( pathKey !== this.props.dynamicKey ) {
            var oldPath = this.props.dynamicKey;
            var firstCall = oldPath === undefined;
            var events = util.keys(this.subs);
            util.each(events, this._stopObserving, this);
            firstCall || log('Path(%s) stopped observing dynamic key %s', this.name(), oldPath);
            this.props.dynamicKey = pathKey;
            if( pathKey !== null ) {
               assertValidFirebaseKey(pathKey);
               log('Path(%s) observing dynamic key %s', this.name(), pathKey);
               firstCall && this.triggerEvent('dynamicKeyLoaded', pathKey);
               util.each(events, this._startObserving, this);
            }
         }
      },

      _waitForReady: function(doneCallback, context) {
         this.observeOnce('dynamicKeyLoaded', function() {
            log.debug('Path(%s) loadData() dynamic key loaded, completing data load', this.name());
            if( this.isReadyForOps() ) {
               this.loadData(doneCallback, context);
            }
            else {
               log('Path(%s) has a dynamic key but the key was null. Returning null for value');
               doneCallback.call(context, null);
            }
         }, this);
      },

      _stopObserving: function(event) {
         this.ref(true).off(event, this.subs[event], this);
      },

      _startObserving: function(event) {
         this.subs[event] = util.bind(this._sendEvent, this, event);
         this.ref(true).on(event, this.subs[event], this.abortObservers, this);
      }
   };

   util.inherit(Path, util.Observable);

   /** UTILS
    ***************************************************/

   function buildPathProps(props, parent) {
      if( util.isFirebaseRef(props) || props instanceof join.JoinedRecord ) {
         props = { ref: props };
      }
      else {
         if( !props.ref ) {
            throw new Error('Must declare ref in properties hash for all Util.Join functions');
         }
         props = util.extend({}, props);
      }

      var out = util.extend({
         intersects: false,
         ref: null,
         keyMap: null,
         sortBy: false,
         pathName: null,
         dynamicSource: null,
         dynamicKey: undefined,
         dynamicAbstracts: {},
         sync: false,
         callback: function(path, event, snap, prevChild) {}
      }, props);

      if( util.isArray(out.keyMap) ) {
         out.keyMap = arrayToMap(out.keyMap);
      }

      out.pathName = (parent && !out.dynamicSource? refName(parent).replace(/\/$/, '')+'/' : '') + refName(out.ref);
      return out;
   }

   function refName(ref) {
      return (util.isFunction(ref, 'name') && ref.name()) || (util.isFunction(ref, 'ref') && ref.ref().name()) || '';
   }

   function arrayToMap(map) {
      var out = {};
      util.each(map, function(m) {
         out[m] = m;
      });
      return out;
   }

   function parseValue(data) {
      if( util.has(data, '.value') ) {
         data = data['.value'];
      }
      if( util.isEmpty(data) ) {
         data = null;
      }
      return data;
   }

   function getFirebaseValue(path, data, sourceKey, aliasedKey, useSourceKey) {
      var key = useSourceKey? sourceKey : aliasedKey;
      var val = null;
      if( !useSourceKey && path.hasDynamicChild(sourceKey) ) {
         var dynKey = '.id:'+aliasedKey;
         val = util.has(data, dynKey)? data[dynKey] : null;
      }
      else if( util.has(data, key) ) {
         val = data[key];
      }
      return val;
   }

   //todo move this to a util method on exports
   function assertValidFirebaseKey(key) {
      if( typeof(key) === 'number' ) { key = key +''; }
      if( typeof(key) !== 'string' || key.match(/[.#$\[\]]/) ) {
         throw new Error('Invalid path in dynamic key, must be non-empty and cannot contain ".", "#", "$", "[" or "]"');
      }
   }

   join.Path = Path;

})(fb);