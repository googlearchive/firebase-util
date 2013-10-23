(function (fb) {
   "use strict";
   var undefined;
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   /** PATH
    ***************************************************
    * @private
    * @constructor
    */
   function Path(props) {
      this.subs = [];
      this.props = buildPathProps(props);
      this.resolveFn = null;
      if( !this.props.pathName ) {
         throw new Error('No pathName found; '+(this.props.ref && !this.props.ref.name()? 'path cannot be set to the Firebase root' : 'must be declared for dynamic paths'));
      }
      if( util.isEmpty(this.props.keyMap) ) {
         if( this.props.ref ) {
            this._buildKeyMap();
         }
         else {
            throw new Error('No keyMap found; must be declared for dynamic paths');
         }
      }
   }

   join.Path = util.inherit(Path, new util.Observable(['child_added', 'child_removed', 'child_moved', 'child_changed', 'value']), {
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
      setSortBy: function(b) { this.props.sortBy = b; },
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

      onObserverAdded: function(event, observer) {
         if( !this.isDynamic() && !this.subs[event] ) {
            var fn = util.bind(this._sendEvent, this, event);
            this.subs[event] = this.props.ref.on(event, fn, function(err) {
               fb.log.error(err);
            });
         }
      },

      onObserverRemoved: function(event) {
         if( !this.hasObservers(event) && this.subs[event] ) {
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
         if( !this.isJoinedChild() || event === 'value' || this.hasKey(snap.name()) ) {
            fb.log.debug('Path(%s)::sendEvent(%s, %s): %j, %s)', this.name(), event, snap.name(), snap.val(), prevChild); //debug
            this.triggerEvent(event, this, event, snap, prevChild);
         }
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
         var b = snap.val() !== null;
         if( b ) {
            var km = this.props.keyMap = {};
            if( util.isObject(snap.val()) ) {
               util.each(snap.val(), function(v, k) { km[k] = k; });
            }
            else {
               km['.value'] = this.props.pathName;
            }
         }
         fb.log.debug('_loadKeyMapFromSnap', this.toString(), this.props.keyMap);
         return b;
      }
   });

   /** UTILS
    ***************************************************/

   function buildPathProps(props, allowSortPath) {
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
         keyMap: {},
         sortBy: false,
         pathName: null,
         isJoinedChild: false,
         callback: function(path, event, snap, prevChild) {}
      }, props);

      // revoke the sortBy if caller says it's not allowed for this path
      if( allowSortPath ) { out.sortBy = false; }

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
         childFn: function(key) { return ref.child(key); },
         pathName: ref.name()
      }
   }

})(fb);