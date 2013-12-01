(function (fb) {
   "use strict";
   var log  = fb.pkg('log');
   var util = fb.pkg('util');
   var join = fb.pkg('join');
   var EVENTS = ['child_added', 'child_removed', 'child_moved', 'child_changed', 'value', 'keyMapLoaded'];

   /** PATH
    ***************************************************
    * @private
    * @constructor
    */
   function Path(props, parent) {
      this._super(this, EVENTS, util.bindAll(this, { onAdd: this._observerAdded, onRemove: this._observerRemoved, onEvent: this._eventTriggered }));
      this.subs = [];
      this.joinedParent = parent;
      this.props = buildPathProps(props, parent);
      // map of dynamic fields that have to be loaded separately, see _buildKeyMap() and _parseData()
      this.dynamicChildPaths = {};
      if( !this.props.pathName ) {
         throw new Error('No pathName found; path cannot be set to Firebase root');
      }
      if( parent ) {
         this._loadKeyMapFromParent(parent);
      }
      else {
         this._buildMasterKeyMap();
      }
   }

   Path.prototype = {
      child: function(aliasedKey) {
         var key = this.isJoinedChild()? this.sourceKey(aliasedKey) : aliasedKey;
         if( this.isDynamicChild(key) ) {
            return this.dynamicChildPaths[key];
         }
         else {
            return new Path(this.ref().child(key), this);
         }
      },

      dynamicChild: function(aliasedKey, callback, context) {
         var key = this.sourceKey(aliasedKey), self = this;
         self.ref().on('value', fn);
         function fn(snap) {
            var data = snap.val();
            if( util.has(data, key) ) {
               self.ref().off('value', fn);
               callback.call(context, self.dynamicChildPaths[key].child(data[key]));
            }
         }
      },

      name: function() { return this.props.pathName; },
      toString: function() { return this.ref().toString(); },

      loadData: function(doneCallback, context) {
         util.defer(function() {
            this.ref().once('value', function(snap) {
               if( this.isJoinedChild() ) {
                  this._parseRecord(snap, doneCallback, context);
               }
               else {
                  this._parseRecordSet(snap, doneCallback, context);
               }
            }, this)
         }, this);
      },

      pickAndSet: function(data, callback) {
         if( data === null ) {
            this.ref().remove(callback);
         }
         else if( this.isJoinedChild() ) {
            this.ref().set(this._pickMyData(data), callback);
            //todo dynamic paths
            //todo
            //todo
            //todo
            //todo
         }
         else {
            this.ref().set(util.mapObject(data, this._pickMyData, this), function(err) {
               callback(err);
            });
            //todo dynamic paths
            //todo
            //todo
            //todo
            //todo
         }
      },

      pickAndUpdate: function(data, callback) {
         if( !util.isObject(data) ) {
            throw new Error('Update failed: First argument must be an object containing the children to replace.');
         }
         else {
            if( this.isJoinedChild() ) {
               var filteredData = util.mapObject(this.getKeyMap(), function(aliasedKey, sourceKey) {
                  return data[aliasedKey];
               });

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
      },

      isIntersection: function() { return this.props.intersects; },
      isSortBy: function() { return this.props.sortBy; },
      setSortBy: function(b) { this.props.sortBy = b; },
      ref: function() { return this.props.ref; },
      hasKey: function(key) {
         return util.contains(this.getKeyMap(), key);
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

      isJoinedChild: function() { return !!this.joinedParent; },

      isPrimitive: function() {
         return util.has(this.getKeyMap(), '.value') && this.isJoinedChild();
      },

      // see the reconcilePaths() method in PathLoader.js
      removeConflictingKey: function(sourceKey, owningPath) {
         log('Path(%s) cannot use key %s->%s; that destination field is owned by Path(%s). You could specify a keyMap and map them to different destinations if you want both values in the joined data.', this, sourceKey, this.getKeyMap()[sourceKey], owningPath);
         delete this.props.keyMap[sourceKey];
      },

      /**
       * Unless keyMap is passed in the config, it will be empty until the first data set is fetched!
       * @returns {Object} a hash
       */
      getKeyMap: function() {
         return this.props.keyMap || {};
      },

      eachKey: function(data, callback, context) {
         this._iterateKeys(data, callback, context, false);
      },

      eachSourceKey: function(data, callback, context) {
         this._iterateKeys(data, callback, context, true);
      },

      /**
       * Given a set of values loaded from a database, map them according to my keyMap for use in event
       * notifications.
       *
       * @param data
       * @private
       */
      _mapMyValues: function(data) {
         var out = {};
         this.eachSourceKey(data, function(sourceKey, aliasedKey, value) {
            out[aliasedKey] = value;
         });
         return util.isEmpty(out)? null : out;
      },

      /**
       * Given a set of keyMapped data, return it to the raw format usable for use in my set/update
       * functions. Dynamic keyMap values are replaced by their ids
       *
       * @param data
       * @private
       */
      _pickMyData: function(data) {
         var out = {};
         this.eachKey(pickDataForSetOps(data, this.isPrimitive(), this.getKeyMap()), function(sourceKey, aliasedKey, value) {
            if( this.isDynamicChild() ) {
               throw new Error('I do not know how to write dynamic data yet :(((')
               //todo
               //todo
               //todo
               //todo
               //todo
               //todo
               //todo
               //todo
            }
            out[sourceKey] = value;
         }, this);
         return util.isEmpty(out)? null : out;
      },

      _observerAdded: function(event) {
         event === 'keyMapLoaded' || log.debug('Added "%s" observer to Path(%s), I have %d observers for this event', event, this.name(), this.getObservers(event).length);
         if( event === 'keyMapLoaded' ) {
            if( this.props.keyMap ) {
               this._finishedKeyMap();
            }
         }
         else if( !this.subs[event] ) {
            var fn = util.bind(this._sendEvent, this, event);
            var self = this;
//            log('_observerAdded', event, this.name());
            this.subs[event] = this.props.ref.on(event, fn, this.abortObservers, this);
            if( event === 'value' ) {
               this._startDynamicListeners();
            }
         }
      },

      _observerRemoved: function(event, obsList) {
         event !== 'keyMapLoaded' && obsList.length && log.debug('Removed "%s" observers (%d) from Path(%s), %d remaining', event, obsList.length, this.name(), this.getObservers(event).length);
         if( !this.hasObservers(event) && this.subs[event] ) {
            this.props.ref.off(event, this.subs[event]);
            delete this.subs[event];
            if( event === 'value' ) {
               this._stopDynamicListeners();
            }
         }
      },

      _eventTriggered: function(event) {
         if( event === 'keyMapLoaded' ) {
            this.stopObserving('keyMapLoaded');
         }
      },

      _startDynamicListeners: function() {
         this.isJoinedChild() && util.each(this.dynamicChildPaths, util.bind(this._startDynamicPath, this));
      },

      _startDynamicPath: function(path) {
         if( !path.hasObservers('value') ) {
            path.observe('value', this._dynamicPathUpdated, this);
         }
      },

      _dynamicPathUpdated: function(/*path, snapForDynamicKey*/) {
         this.ref().once('value', function(snap) {
            this.hasObservers('value') && this._sendEvent('value', snap);
         }, this);
      },

      _stopDynamicListeners: function() {
         this.isJoinedChild() && util.call(this.dynamicChildPaths, 'stopObserving');
      },

      _sendEvent: function(event, snap, prevChild) {
         // the hasKey here is critical because we only trigger events for children
         // which are part of our keyMap on the child records (the joined parent gets all, of course)
         if( event === 'value' ) {
            this.loadData(fn, this);
         }
         else if( !this.isJoinedChild() ) {
            util.defer(util.bind(fn, this, this._mapMyValues(snap.val())));
//            fn.call(this, mapValues(this.getKeyMap(), snap.val()));
         }
         else if( this.hasKey(snap.name()) ) {
            if( this.isDynamicChild(snap.name())) {
               this.dynamicChildPaths[snap.name()].loadData(fn, this);
            }
            else {
               util.defer(util.bind(fn, this, snap.val()));
//               fn.call(this, snap.val());
            }
         }

         function fn(data) {
            if( util.isEmpty(data) ) { data = null; }
            if( data !== null || util.contains(['child_removed', 'value'], event) ) {
               //               log('Path(%s/%s)::sendEvent(%s, %s%j, %s) to %d observers', this.ref().parent().name(), this.name(), event, event==='value'? '' : snap.name()+': ', data, prevChild, this.getObservers(event).length);
               this.triggerEvent(event, this, event, snap.name(), data, prevChild, snap.getPriority());
            }
         }
      },

      isDynamicChild: function(key) {
         return util.has(this.dynamicChildPaths, key);
      },

      // this should only ever be called on the master JoinedRecord
      // child joins should already have a key map provided when childPath() is called
      _buildMasterKeyMap: function(cb) {
         var km = this.props.keyMap;
         if( !util.isObject(km) ) {
            // sample several records (but not hundreds) and load the keys from each so
            // we get an accurate union of the fields in the child data; they are supposed
            // to be consistent, but some could have null values for various reasons,
            // so this should help avoid inconsistent keys
            this.ref().limit(25).once('value', function(snap) {
               this._loadKeyMapFromSnap(snap);
               this._finishedKeyMap();
               cb && cb(this);
            }, this);
         }
         else {
            var dynamicPaths = this.dynamicChildPaths;
            util.each(km, function(v, k) {
               if( util.isObject(v) ) {
                  var toKey = k;
                  if( v instanceof Firebase || v instanceof join.JoinedRecord ) {
                     v = {
                        ref: v,
                        keyMap: {'.value': '.value'}
                     };
                  }
                  else if(v.aliasedKey) {
                     toKey = v.aliasedKey;
                  }
                  km[k] = toKey;
                  dynamicPaths[k] = new Path(v);
               }
            });
            this._finishedKeyMap();
            cb && cb(this);
         }
      },

      _loadKeyMapFromParent: function(parent) {
         parent.observe('keyMapLoaded', function(keyMap) {
            if( parent.isJoinedChild() ) {
               this.props.keyMap = { '.value': '.value' };
               this._finishedKeyMap();
            }
            else {
               this.props.intersects = parent.isIntersection();
               this.dynamicChildPaths = cloneDynamicPaths(parent.dynamicChildPaths);
               this.props.keyMap = keyMap;
               this._finishedKeyMap();
            }
         }, this);
      },

      _finishedKeyMap: function() {
         if( util.isEmpty(this.props.keyMap) ) {
            throw Error('Could not load a keyMap for Path(%s); declare one or add a record to this path. No data can be written to or read from this path without a keyMap:(', this);
         }
         this.triggerEvent('keyMapLoaded', this.props.keyMap);
      },

      _loadKeyMapFromSnap: function(samplingSnap) {
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
         return b;
      },

      _parseRecord: function(snap, callback, scope) {
         var out = {}, q = util.createQueue(), dynamicPaths = this.dynamicChildPaths;
         var data = snap.val();
         if( !util.isEmpty(data) ) {
            util.each(this.getKeyMap(), function(aliasedKey, sourceKey) {
               if( this.isDynamicChild(sourceKey) ) {
                  if( util.has(data, sourceKey) && !util.isEmpty(data[sourceKey]) ) {
                     q.addCriteria(function(cb) {
                        dynamicPaths[sourceKey].child(data[sourceKey]).loadData(function(dynData) {
                           dynData !== null && (out[aliasedKey] = util.extend({'.id': data[sourceKey]}, extractValue(dynData)));
                           cb();
                        });
                     });
                  }
               }
               else if( sourceKey === '.value' ) {
                  out[aliasedKey] = data;
               }
               else if( util.has(data, sourceKey) ) {
                  out[aliasedKey] = data[sourceKey];
               }
            }, this);
         }
         q.done(function() {
            callback.call(scope, util.isEmpty(out)? null : out, snap);
         });
         return callback;
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
            callback.call(scope, util.isEmpty(out)? null : out, parentSnap);
         });
      },

      _iterateKeys: function(data, callback, context, useSourceKey) {
         var map = this.getKeyMap();
         if( this.isPrimitive() ) {
            callback.call(context, '.value', map['.value'], data);
         }
         else {
            util.each(map, function(aliasedKey, sourceKey) {
               var key = useSourceKey? sourceKey : aliasedKey;
               callback.call(context, sourceKey, aliasedKey, util.has(data, key)? data[key] : null);
            });
         }
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
         callback: function(path, event, snap, prevChild) {}
      }, props);

      if( util.isArray(out.keyMap) ) {
         out.keyMap = arrayToMap(out.keyMap);
      }

      out.pathName = (parent? parent.name().replace(/.*\//, '')+'/' : '') + out.ref.name();

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

   function cloneDynamicPaths(paths) {
      var out = {};
      util.each(paths, function(p, k) {
         out[k] = new Path(p.props);
      });
      return out;
   }

   function extractValue(data) {
      return util.isObject(data) && data['.value']? data['.value'] : data;
   }

   function pickDataForSetOps(data, isPrimitive, keyMap) {
      if( !util.isObject(data) ) {
         return data;
      }
      return isPrimitive? util.val(data, keyMap['.value']) : data;
   }

   join.Path = Path;

})(fb);