(function (fb) {
   "use strict";

   var join = fb.package('join');

   /** PATH
    ***************************************************
    * @private
    * @constructor
    */
   function Path(props, rec) {
      this.subs = [];
      this.props = buildPathProps(props);
      this.rec = rec;
      this.resolveFn = null;
      if( !this.props.pathName ) {
         throw new Error('No pathName found; '+(this.props.ref && !this.props.ref.name()? 'path cannot be set to the Firebase root' : 'must be declared for dynamic paths'));
      }
      if( fb.util.isEmpty(this.props.keyMap) ) {
         if( this.props.ref ) {
            this._buildKeyMap();
         }
         else {
            throw new Error('No keyMap found; must be declared for dynamic paths');
         }
      }
   }

   Path.prototype = {
      child: function(key, snap) {
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
         var ref = this.child(childKey, new join.EmptySnap(childRec, childKey));
         var childPath;
         if( !ref ) {
            childPath = new Path({}, childRec);
            childPath.resolveFn = function(snap) {
               return childPath.child(childKey, snap);
            };
         }
         else {
            childPath = new Path({
               ref: ref,
               keyMap: this.props.keyMap,
               isJoinedChild: true,
               pathName: this.props.pathName
            });
         }
         return childPath;
      },

      name: function() { return this.props.pathName; },
      toString: function() { return this.ref()? this.ref().toString() : '[dynamic path:'+this.name()+']'; },

      isDynamic: function() { return !this.ref(); },
      isIntersection: function() { return this.props.intersects; },
      isSortBy: function() { return this.props.sortBy; },
      ref: function() { return this.props.ref; },
      hasKey: function(key) { return this.props.keyMap.hasOwnProperty(key); },
      isUnresolved: function() { return this.resolveFn !== null; },
      isJoinedChild: function() { return this.props.isJoinedChild; },

      tryResolve: function(snap) {
         var ref = this.resolveFn(snap);
         if( ref ) {
            this.props.ref = ref;
            this.resolveFn = null;
            this.props.pathName = ref.name;
         }
         return !!ref;
      },

      on: function(event) {
         fb.log('Path.on(%s)', event); //debug
         if( !this.isDynamic() && !this.subs[event] ) {
            var fn = fb.util.bind(this._sendEvent, this, event);
            this.subs[event] = this.props.ref.on(event, fn, function(err) {
               fb.log.error(err);
            });
         }
      },

      off: function(event) {
         if( !this.isDynamic() && this.subs[event] ) {
            this.props.ref.off(event, this.subs[event]);
            delete this.subs[event];
         }
      },

      /**
       * Unless keyMap is passed in the config, it will be empty until the first data set is fetched!
       * @returns {Object} a hash
       */
      getKeyMap: function() {
         return this.props.keyMap;
      },

      _sendEvent: function(event, snap, prevChild) {
         this.props.callback(this, event, snap, prevChild);
      },

      // this should only ever be called on the master JoinedRecord
      // child joins should already have a key map provided when childPath() is called
      _buildKeyMap: function() {
         var self = this;
         this.props.ref.limit(1).once('value', function(outerSnap) {
            outerSnap.forEach(function(snap) {
               return self._loadKeyMapFromSnap(snap);
            });
         });
      },

      _loadKeyMapFromSnap: function(snap) {
         if( snap.val() === null ) {
            fb.log.warn('No keyMap found for "%s". This can happen because the path has no data and you have not passed the keyMap option in your properties hash (see "key maps" in src/join/README.md). If a set() or push() operation is called before any records are downloaded, then this path will be ignored and not properly included.', self.toString());
         }
         else {
            var km = this.props.keyMap = {};
            if( fb.util.isObject(snap.val()) ) {
               fb.util.each(snap.val(), function(v, k) { km[k] = k; });
            }
            else {
               km['.value'] = this.pathName;
            }
         }
         fb.log.debug('_loadKeyMapFromSnap', this.props.keyMap, snap.val(), this.toString());
         return false;
      }
   };

   /** UTILS
    ***************************************************/

   function buildPathProps(props) {
      if( props instanceof Firebase ) {
         props = propsFromRef(props);
      }
      else {
         if( !props.ref ) { throw new Error('Must declare ref in properties hash for all Util.Join functions'); }
         props = propsFromHash(props);
      }

      var out = fb.util.extend({
         intersects: false,
         childFn: null,
         ref: null,
         keyMap: {},
         sortBy: false,
         pathName: null,
         isJoinedChild: false,
         callback: function(path, event, snap, prevChild) {}
      }, props);

      if( fb.util.isArray(out.keyMap) ) {
         out.keyMap = arrayToMap(out.keyMap);
      }
      return out;
   }

   function arrayToMap(map) {
      var out = {};
      fb.util.each(map, function(m) {
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
      return fb.util.extend({}, props, addOpts, props.pathName? {pathName: props.pathName} : {});
   }

   function propsFromRef(ref) {
      return {
         ref: ref,
         childFn: function(key) { return ref.child(key); },
         pathName: ref.name()
      }
   }

   join.Path = Path;

})(fb);