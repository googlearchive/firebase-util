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
         return new Path(this.ref().child(sourceKey), this);
      },

      /**
       * @param {Firebase} sourceRef path where the dynamic key's value is kept
       * @param {String} aliasedKey name of the key where I put my data
       * @returns {Path}
       */
      dynamicChild: function(sourceRef, aliasedKey) {
         return new Path({
            ref: this.ref(),
            dynamicSource: sourceRef,
            keyMap: {'.value': aliasedKey}
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
               this.ref().once('value', function(snap) {
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

      pickAndSet: function(data, callback) {
         if( this.isReadyForOps() ) {
            var ref = this._getOrSetDynamicSource(data);
            if( ref !== null ) {
               if( data === null ) {
                  ref.remove(callback);
               }
               else if( this.isJoinedChild() ) {
                  ref.set(this._pickMyData(data), callback);
               }
               else {
                  ref.set(util.mapObject(data, this._pickMyData, this), callback);
               }
            }
         }
         else {
            log.info('Tried to call set() on Path(%s) but it is a dynamic path with no key (nowhere to go)');
         }
      },

      pickAndUpdate: function(data, callback) {
         if( !util.isObject(data) ) {
            throw new Error('Update failed: First argument must be an object containing the children to replace.');
         }
         else if( this.isReadyForOps() ) {
            var ref = this._getOrSetDynamicSource(data);
            if( ref !== null ) {
               if( this.isJoinedChild() ) {
                  var filteredData = util.mapObject(data, function(val, key) {
                     return this.hasKey(key);
                  }, this);

                  if( !util.isEmpty(filteredData) ){
                     this.ref().update(filteredData, callback);
                  }
               }
               else {
                  var q = util.createQueue(), parentPath = this;
                  util.each(data, function(childData, key) {
                     q.addCriteria(function(cb) {
                        parentPath.child(key).pickAndSet(childData, cb);
                     });
                  });
                  q.handler(callback);
               }
            }
         }
         else {
            log.info('Tried to call update() on Path(%s) but it is a dynamic path with no key (nowhere to go)');
         }
      },

      isIntersection: function() { return this.props.intersects; },
      isSortBy: function() { return this.props.sortBy; },
      setSortBy: function(b) { this.props.sortBy = b; },

      ref: function() {
         if( this.isDynamic() ) {
            if( !this.isReadyForOps() ) {
               return null;
            }
            else {
               return this.props.ref.child(this.props.dynamicKey);
            }
         }
         else {
            return this.props.ref;
         }
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
       * see the reconcilePaths() method in PathLoader.js
       * @param {string} sourceKey
       * @param {Path} [owningPath]
       */
      removeConflictingKey: function(sourceKey, owningPath) {
         owningPath && log('Path(%s) cannot use key %s->%s; that destination field is owned by Path(%s). You could specify a keyMap and map them to different destinations if you want both values in the joined data.', this, sourceKey, this.getKeyMap()[sourceKey], owningPath);
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
       * the aliased key or .value). Dynamic keyMap refs return the id value
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
       * the aliased key or .value). Dynamic keyMap refs return whatever value is in data (assumed to be loaded
       * from db already)
       *
       * @param data
       * @param iterator
       * @param [context]
       */
      eachSourceKey: function(data, iterator, context) {
         this._iterateKeys(data, iterator, context, true);
      },

      getDynamicKeys: function() {
         return this.dynamicChildPaths;
      },

      /**
       * Given a set of keyMapped data, return it to the raw format usable for use in my set/update
       * functions. Dynamic keyMap values are excluded.
       *
       * @param data
       * @private
       */
      _pickMyData: function(data) {
         var out = {};
         this.eachKey(data, function(sourceKey, aliasedKey, value) {
            out[sourceKey] = value;
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

      _buildKeyMap: function(parent) {
         var km = this.props.keyMap;
         if( !util.isObject(km) ) {
            if( parent ) {
               this._loadKeyMapFromParent(parent);
            }
            else {
               this._loadKeyMapFromData();
            }
         }
         else {
            this._parseRawKeymap();
            this._finishedKeyMap();
         }
      },

      _parseRawKeymap: function() {
         var km = this.props.keyMap;
         var dynamicPaths = {};
         util.each(km, function(v, k) {
            if( util.isObject(v) ) {
               var toKey = k;
               if( v instanceof Firebase || v instanceof join.JoinedRecord ) {
                  v = {
                     ref: v,
                     keyMap: {'.value': toKey}
                  };
               }
               else if(v.aliasedKey) {
                  toKey = v.aliasedKey;
               }
               km[k] = toKey;
               dynamicPaths[k] = new Path(v);
            }
         });
         if( !util.isEmpty(dynamicPaths) ) { this.dynamicChildPaths = dynamicPaths; }
      },

      _loadKeyMapFromParent: function(parent) {
         parent.observeOnce('keyMapLoaded', function(keyMap) {
            if( parent.isJoinedChild() ) {
               this.props.keyMap = { '.value': '.value' };
               this._finishedKeyMap();
            }
            else {
               this.props.intersects = parent.isIntersection();
               this.props.keyMap = util.extend({}, keyMap);
               this._finishedKeyMap();
            }
         }, this);
      },

      _finishedKeyMap: function() {
         if( util.isEmpty(this.props.keyMap) ) {
            throw Error('Could not load a keyMap for Path(%s); declare one or add a record to this path. No data can be written to or read from this path without a keyMap:(', this);
         }
         this.observeOnce('dynamicKeyLoaded', function() {
            log.debug('Finished keyMap for Path(%s)', this.toString(), this.props.keyMap);
            this.triggerEvent('keyMapLoaded', this.props.keyMap);
         }, this);
      },

      _loadKeyMapFromData: function() {
         // sample several records (but not hundreds) and load the keys from each so
         // we get an accurate union of the fields in the child data; they are supposed
         // to be consistent, but some could have null values for various reasons,
         // so this should help avoid inconsistent keys
         this.ref().limit(25).once('value', function(samplingSnap) {
            var b = util.isObject(samplingSnap.val()) && this.props.keyMap === null;
            if( b ) {
               var km = this.props.keyMap = {};
               var keys = [];
               var props = this.props;
               // we sample several records and look for keys so if a key is missing from one or two
               // we don't get funky and skewed results (we hope)
               samplingSnap.forEach(function(snap) {
                  keys.push(snap.name());
                  if( util.isObject(snap.val()) ) {
                     // got an object, add an keys in that object to our map
                     util.each(snap.val(), function(v, k) { km[k] = k; });
                     return false;
                  }
                  else if( !util.isEmpty(snap.val()) ) {
                     // got a primitive, so the only key is .value and we cancel iterations
                     km = props.keyMap = {'.value': props.pathName};
                     return true;
                  }
               });
               log.info('Loaded keyMap for Path(%s) from child records "%s": %j', this.toString(), keys, km);
            }
            this._finishedKeyMap();
         }, this);
      },

      _parseRecordSet: function(parentSnap, callback, scope) {
         var out = {}, self = this;
         var q = util.createQueue();
         parentSnap.forEach(function(recSnap) {
            q.addCriteria(function(cb) {
               self._parseRecord(recSnap, function(childData) {
                  childData === null || (out[recSnap.name()] = childData);
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
            log.debug('Path(%s) _parseRecord %s: %j', this.name(), snap.name(), out);
            callback.call(scope, out, snap);
         }, this);
         return callback;
      },

      _parseValue: function(queue, out, snap, sourceKey, aliasedKey, value) {
         if( value !== null ) {
            if( this.hasDynamicChild(sourceKey) ) {
               out['.id:'+aliasedKey] = value;
               queue.addCriteria(function(cb) {
                  this._parseDynamicChild(
                     snap,
                     sourceKey,
                     aliasedKey,
                     function(dynData) {
                        util.isObject(dynData) && (out[aliasedKey] = dynData);
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

      _iterateKeys: function(data, callback, context, useSourceKey) {
         var map = this.getKeyMap();
         if( map['.value'] ) {
            callback.call(context, '.value', map['.value'], data);
         }
         else {
            util.each(map, function(aliasedKey, sourceKey) {
               var val = getFirebaseValue(this, data, this.hasDynamicChild(sourceKey), sourceKey, aliasedKey, useSourceKey);
               callback.call(context, sourceKey, aliasedKey, val);
            }, this);
         }
      },

      _getOrSetDynamicSource: function(data) {
         if( this.isDynamic() ) {
            var dynamicKey = '.id:'+this.aliasedKey(this.props.dynamicSource.name());
            if( util.has(data, dynamicKey) ) {
               var newDynamicKey = data[dynamicKey];
               if( newDynamicKey !== this.props.dynamicKey ) {
                  newDynamicKey === null || assertValidFirebaseKey(newDynamicKey);
                  this.props.dynamicSource.set(newDynamicKey);
               }
               return newDynamicKey === null? null : this.props.ref.child(newDynamicKey);
            }
            else {
               return this.props.ref.child(this.props.dynamicKey);
            }
         }
         else {
            return this.ref();
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
         var firstCall = this.props.dynamicKey === undefined;
         var events = util.keys(this.subs);
         util.each(events, this._stopObserving, this);
         this.props.dynamicKey = pathKey;
         if( pathKey !== null ) {
            assertValidFirebaseKey(pathKey);
            firstCall && this.triggerEvent('dynamicKeyLoaded', pathKey);
            util.each(events, this._startObserving, this);
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
         this.ref().off(event, this.subs[event], this);
      },

      _startObserving: function(event) {
         this.subs[event] = util.bind(this._sendEvent, this, event);
         this.ref().on(event, this.subs[event], this.abortObservers, this);
      }
   };

   util.inherit(Path, util.Observable);

   /** UTILS
    ***************************************************/

   function buildPathProps(props, parent) {
      if( props instanceof Firebase || props instanceof join.JoinedRecord ) {
         props = propsFromRef(props);
      }
      else {
         if( !props.ref ) {
            throw new Error('Must declare ref in properties hash for all Util.Join functions');
         }
         props = propsFromHash(props);
      }

      var out = util.extend({
         intersects: false,
         ref: null,
         keyMap: null,
         sortBy: false,
         pathName: null,
         dynamicSource: null,
         dynamicKey: undefined,
         callback: function(path, event, snap, prevChild) {}
      }, props);

      if( util.isArray(out.keyMap) ) {
         out.keyMap = arrayToMap(out.keyMap);
      }

      out.pathName = (parent && !out.dynamicSource? (parent.name()||'').replace(/\/$/, '')+'/' : '') + out.ref.name();

      return out;
   }

   function arrayToMap(map) {
      var out = {};
      util.each(map, function(m) {
         out[m] = m;
      });
      return out;
   }

   function propsFromHash(props) {
      var addOpts = propsFromRef(props.ref);
      return util.extend({}, props, addOpts);
   }

   function propsFromRef(ref) {
      return {
         ref: ref
      }
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

   function getFirebaseValue(path, data, isDynamicChild, sourceKey, aliasedKey, useSourceKey) {
      var key = useSourceKey? sourceKey : aliasedKey;
      var val = null;
      if( util.has(data, key) ) {
         if( isDynamicChild && !useSourceKey ) {
            if( util.has(data[key], '.id') && !util.isObject(data[key]['.id']) ) {
               val = data[key]['.id'];
            }
            else {
               log.warn('A value was added for dynamic key %s but it is not an object with a proper .id value. The dynamic ref will be removed from Path(%s), which you may not have intended', aliasedKey, path.toString());
            }
         }
         else {
            val = data[key];
         }
      }
      return val;
   }

   function isEmpty(data) {
      return util.isEmpty(data) || !util.contains(data, function(v, k) {
         return !(k+'').match(/^\.id:/);
      });
   }

   //todo move this to a util method on exports
   function assertValidFirebaseKey(key) {
      if( typeof(key) === 'number' ) { key = key +''; }
      if( typeof(key) !== 'string' || key.match(/[.#$\[\]]/) ) {
         throw new Error('Invalid path in dynamic key, must be non-empty and cannot contain ".", "#", "$", "[" or "]"');
      }
   }

//   function withoutDynamicKey(data, key) {
//      var val = null;
//      if( util.has(data, key) && !util.isArray(data[key]) ) {
//         val = util.extend({}, data[key]);
//         delete val['.id'];
//      }
//      return val;
//   }

//   function valueWithId(data, id) {
//      if( !util.isObject(data) ) {
//         data = { '.value': data };
//      }
//      return util.extend(data, {'.id': id});
//   }

   join.Path = Path;

})(fb);