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
   function Path(props) {
      this._super(this, EVENTS, util.bindAll(this, { onAdd: this._observerAdded, onRemove: this._observerRemoved }));
      this.subs = [];
      this.props = buildPathProps(props);
      this.resolveFn = null;
      if( !this.props.pathName ) {
         throw new Error('No pathName found; '+(this.props.ref && !this.props.ref.name()? 'path cannot be set to the Firebase root' : 'must be declared for dynamic paths'));
      }
      this._buildKeyMap();
   }

   Path.prototype = {
      child: function(key, snap) {
         if( this.isJoinedChild() ) {
            // the keymap can rename things, so when it does, we need to find the original
            // paths that we're trying to load
            key = this.sourceKey(key);
         }
         return this.props.childFn(key, snap);
      },

      /**
       * @param {JoinedRecord} childRec
       * @param {String} childKey
       */
      childPath: function(childRec, childKey) {
         // try to resolve the child path with an empty snapshot
         // but if the child method (i.e. it's a dynamic path and needs
         // the snapshot data) returns null, then we will set up
         // a resolve function which will have to be fulfilled before
         // this path is valid (see SnapshotBuilder._tryToResolve
         var opts = {
            ref: this.child(childKey, new join.EmptySnap(childRec, childKey)),
            keyMap: this.props.keyMap,
            isJoinedChild: true,
            pathName: this.props.pathName
         };
         opts.ref || delete opts.ref;
         var childPath = new Path(opts);
         if( !childPath.ref() ) {
            childPath.resolveFn = function(snap) {
               return childPath.child(childKey, snap);
            };
         }
         return childPath;
      },

      name: function() { return this.props.pathName; },
      toString: function() { return this.ref()? this.ref().toString() : '[dynamic path:'+this.name()+']'; },

      isDynamic: function() { return !this.ref(); },
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
      isUnresolved: function() { return this.resolveFn !== null; },
      isJoinedChild: function() { return this.props.isJoinedChild; },

      // see the reconcilePaths() method in PathLoader.js
      removeConflictingKey: function(fromKey, owningPath) {
         log.info('Path(%s) cannot use key %s->%s; that destination field is owned by Path(%s). You could specify a keyMap and map them to different destinations if you want both values in the joined data.', this, fromKey, this.getKeyMap()[fromKey], owningPath);
         delete this.props.keyMap[fromKey];
      },

      tryResolve: function(snap) {
         var ref = this.resolveFn(snap);
         if( ref ) {
            this.props.ref = ref;
            this.resolveFn = null;
            this.props.pathName = ref.name;
         }
         return !!ref;
      },

      /**
       * Unless keyMap is passed in the config, it will be empty until the first data set is fetched!
       * @returns {Object} a hash
       */
      getKeyMap: function() {
         return this.props.keyMap || {};
      },

      _observerAdded: function(event) {
         if( event === 'keyMapLoaded' ) {
            if( this.props.keyMap !== null ) {
               this._finishedKeyMap();
            }
         }
         else if( !this.isDynamic() && !this.subs[event] ) {
            var fn = util.bind(this._sendEvent, this, event);
            this.subs[event] = this.props.ref.on(event, fn, function(err) {
               log.error(err);
            });
         }
      },

      _observerRemoved: function(event) {
         if( !this.hasObservers(event) && this.subs[event] ) {
            this.props.ref.off(event, this.subs[event]);
            delete this.subs[event];
         }
      },

      _sendEvent: function(event, snap, prevChild) {
         // the hasKey here is critical because we only trigger events for children
         // which are part of our keyMap on the child records (the joined parent gets all, of course)
         if( !this.isJoinedChild() || event === 'value' || this.hasKey(snap.name()) ) {
            var mappedVals = mapValues(this.getKeyMap(), snap.val());
            if( mappedVals !== null || event !== 'child_added' ) {
//               log('Path(%s/%s)::sendEvent(%s, %j, %s) to %d observers', this.name(), snap.name(), event, mappedVals, prevChild, this.getObservers(event).length);
               util.defer(function() {
                  this.triggerEvent(event, this, event, snap.name(), mappedVals, prevChild, snap);
               }, this);
            }
         }
      },

      // this should only ever be called on the master JoinedRecord
      // child joins should already have a key map provided when childPath() is called
      _buildKeyMap: function(cb) {
         if( !util.isObject(this.props.keyMap) ) {
            if( !this.isDynamic() && !this.isJoinedChild() ) {
               this.props.ref.limit(1).once('value', function(outerSnap) {
                  var self = this;
                  outerSnap.forEach(function(snap) {
                     return self._loadKeyMapFromSnap(snap);
                  });
                  this._finishedKeyMap();
                  cb && cb(this);
               }, this);
            }
            else {
               throw new Error('No keyMap found for path "'+this.toString()+'"; must be declared for all dynamic paths');
            }
         }
         else {
            this._finishedKeyMap();
            cb && cb(this);
         }
      },

      _finishedKeyMap: function() {
         if( util.isEmpty(this.props.keyMap) ) {
            log.warn('The path "%s" is empty! You either need to add at least one data record into the path or declare a keyMap. No data will be written to or read from this path :(', this);
         }
         this.triggerEvent('keyMapLoaded');
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

   function buildPathProps(props) {
      if( props instanceof Firebase ) {
         props = propsFromRef(props);
      }
      else {
         if( !props.ref ) { throw new Error('Must declare ref in properties hash for all Util.Join functions'); }
         props = propsFromHash(props);
      }

      var out = util.extend({
         intersects: false,
         childFn: null,
         ref: null,
         keyMap: null,
         sortBy: false,
         pathName: null,
         isJoinedChild: false,
         callback: function(path, event, snap, prevChild) {}
      }, props);

      if( !out.ref && out.intersects ) {
         throw Error('Dynamic path "%s" cannot be used as part of an intersection', out.pathName);
      }

      if( util.isArray(out.keyMap) ) {
         out.keyMap = arrayToMap(out.keyMap);
      }
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
      var addOpts = {};
      if( typeof(props.ref) === 'function' ) {
         addOpts = { ref: null, childFn: props.ref };
      }
      else {
         addOpts = propsFromRef(props.ref);
      }
      return util.extend({}, props, addOpts, props.pathName? {pathName: props.pathName} : {});
   }

   function propsFromRef(ref) {
      return {
         ref: ref,
         childFn: function(key) {
            return ref.child(key);
         },
         pathName: ref.name()
      }
   }


   join.Path = Path;

})(fb);