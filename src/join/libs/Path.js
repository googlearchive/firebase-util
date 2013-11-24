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
      this._super(this, EVENTS, util.bindAll(this, { onAdd: this._observerAdded, onRemove: this._observerRemoved }));
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
         this._buildKeyMap();
      }
   }

   Path.prototype = {
      child: function(key) {
         if( this._isDynamicChild(key) ) {
            return this.dynamicChildPaths[key];
         }
         else {
            return new Path(this.ref().child(key), this);
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

      isIntersection: function() { return this.props.intersects; },
      isSortBy: function() { return this.props.sortBy; },
      setSortBy: function(b) { this.props.sortBy = b; },
      ref: function() { return this.props.ref; },
      hasKey: function(key) { return util.contains(this.props.keyMap, key); },
      sourceKey: function(key) {
         var res = null;
         util.find(this.props.keyMap, function(v,k) {
            if( v === key ) {
               res = k;
            }
            return v === key;
         });
         return res;
      },

      isJoinedChild: function() { return !!this.joinedParent; },

      // see the reconcilePaths() method in PathLoader.js
      removeConflictingKey: function(fromKey, owningPath) {
         log('Path(%s) cannot use key %s->%s; that destination field is owned by Path(%s). You could specify a keyMap and map them to different destinations if you want both values in the joined data.', this, fromKey, this.getKeyMap()[fromKey], owningPath);
         delete this.props.keyMap[fromKey];
      },

      /**
       * Unless keyMap is passed in the config, it will be empty until the first data set is fetched!
       * @returns {Object} a hash
       */
      getKeyMap: function() {
         return this.props.keyMap || {};
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
//            console.log('_observerAdded', event, this.name()); //debug
            this.subs[event] = this.props.ref.on(event, fn, function(err) {
               console.log('aborted thingy', event, this.name(), err);
               log.error(err);
               this.abortObservers(err);
            }, this);
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
            util.defer(util.bind(fn, this, mapValues(this.getKeyMap(), snap.val())));
//            fn.call(this, mapValues(this.getKeyMap(), snap.val()));
         }
         else if( this.hasKey(snap.name()) ) {
            if( this._isDynamicChild(snap.name())) {
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

      _isDynamicChild: function(key) {
         return util.has(this.dynamicChildPaths, key);
      },

      // this should only ever be called on the master JoinedRecord
      // child joins should already have a key map provided when childPath() is called
      _buildKeyMap: function(cb) {
         var km = this.props.keyMap;
         if( !util.isObject(km) ) {
            //todo can we replace dynamic keyMap loading with just ['.value']? should work and include everything
            //todo without having to look up the keymap at all!
            if( !this.isJoinedChild() ) {
               this.props.ref.limit(1).once('value', function(outerSnap) {
                  var self = this;
                  outerSnap.forEach(function(snap) {
                     return self._loadKeyMapFromSnap(snap);
                  });
                  this._finishedKeyMap();
                  cb && cb(this);
               }, this);
            }
         }
         else {
            var dynamicPaths = this.dynamicChildPaths;
            util.each(km, function(v, k) {
               if( util.isObject(v) ) {
                  km[k] = v.toKey? v.toKey : k;
                  if( v instanceof Firebase || v instanceof join.JoinedRecord ) {
                     v = {
                        ref: v,
                        keyMap: {'.value': '.value'}
                     };
                  }
                  dynamicPaths[k] = new Path(v);
               }
            });
            this._finishedKeyMap();
            cb && cb(this);
         }
      },

      _loadKeyMapFromParent: function(parent) {
         if( parent.isJoinedChild() ) {
            this.props.keyMap = { '.value': '.value' };
            this._finishedKeyMap();
         }
         else {
            this.props.intersects = parent.isIntersection();
            parent.observe('keyMapLoaded', function(keyMap) {
               this.dynamicChildPaths = cloneDynamicPaths(parent.dynamicChildPaths);
               this.props.keyMap = keyMap;
               this._finishedKeyMap();
            }, this);
         }
      },

      _finishedKeyMap: function() {
         if( util.isEmpty(this.props.keyMap) ) {
            log.warn('The path "%s" is empty! You either need to add at least one data record into the path or declare a keyMap. No data will be written to or read from this path :(', this);
         }
         this.triggerEvent('keyMapLoaded', this.props.keyMap);
         this.stopObserving('keyMapLoaded');
      },

      _loadKeyMapFromSnap: function(snap) {
         var b = snap.val() !== null && this.props.keyMap === null;
         if( b ) {
            var km = this.props.keyMap = {};
            if( util.isObject(snap.val()) ) {
               util.each(snap.val(), function(v, k) { km[k] = k; });
            }
            else {
               km['.value'] = this.props.pathName;
            }
         }
         log.info('Loaded keyMap for Path(%s) from child record "%s": %j', this.toString(), snap.name(), km);
         return b;
      },

      _parseRecord: function(snap, callback, scope) {
         //todo set up a queue here
         var out = {}, fns = [], dynamicPaths = this.dynamicChildPaths;
         var data = snap.val();
         if( !util.isEmpty(data) ) {
            util.each(this.getKeyMap(), function(toKey, fromKey) {
               if( this._isDynamicChild(fromKey) ) {
                  if( util.has(data, fromKey) && !util.isEmpty(data[fromKey]) ) {
                     fns.push(function(cb) {
                        dynamicPaths[fromKey].child(data[fromKey]).loadData(function(data) {
                           data !== null && (out[toKey] = extractValue(data));
                           cb();
                        });
                     });
                  }
               }
               else if( fromKey === '.value' ) {
                  out[toKey] = data;
               }
               else if( util.has(data, fromKey) ) {
                  out[toKey] = data[fromKey];
               }
            }, this);
         }
         util.createQueue(fns)(function() {
            callback.call(scope, util.isEmpty(out)? null : out, snap);
         });
         return callback;
      },

      _parseRecordSet: function(parentSnap, callback, scope) {
         var out = {}, fns = [], self = this;
         parentSnap.forEach(function(recSnap) {
            fns.push(function(cb) {
               self._parseRecord(recSnap, function(childData) {
                  childData === null || (out[recSnap.name()] = childData);
                  cb();
               })
            })
         });
         util.createQueue(fns)(function() {
            callback.call(scope, util.isEmpty(out)? null : out, parentSnap);
         });
      }
   };

   util.inherit(Path, util.Observable);

   /** UTILS
    ***************************************************/

   function mapValues(keyMap, snapVal) {
      var out = {};
      if( snapVal !== null ) {
         if( keyMap['.value'] ) {
            out[ keyMap['.value'] ] = snapVal;
         }
         else if( util.isObject(snapVal) ) {
            util.each(keyMap, function(fromKey, toKey) {
               if( !util.isEmpty(snapVal[fromKey]) ) {
                  out[toKey] = snapVal[fromKey];
               }
            });
         }
      }
      return out;
   }

   function buildPathProps(props, parent) {
      if( props instanceof Firebase ) {
         props = propsFromRef(props);
      }
      else {
         if( !props.ref ) { throw new Error('Must declare ref in properties hash for all Util.Join functions'); }
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

   join.Path = Path;

})(fb);