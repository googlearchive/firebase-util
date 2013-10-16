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
      this.keyMap = {};
      this.props = buildPathProps(props);
      this.pathName = buildPathName(this.props); //todo we can improve this
      this.rec = rec;
      this.resolveFn = null;
   }

   Path.prototype = {
      child: function(key, snap) {
         return this.props.ref(key, snap);
      },

      /**
       * @param {JoinedRecord} rec
       * @param {String} key
       */
      childPath: function(rec, key) {
         // try to resolve the child path with an empty snapshot
         // but if the child method (i.e. it's a dynamic path and needs
         // the snapshot data) returns null, then we will set up
         // a resolve function (making isUnresolved() return true)
         // which will have to be fulfilled before this path is valid
         var ref = this.child(key, new join.EmptySnap(rec, key));
         var childPath;
         if( !ref ) {
            childPath = new Path({}, rec);
            childPath.resolveFn = function(snap) {
               return childPath.child(key, snap);
            };
         }
         else {
            childPath = new Path({ref: ref});
         }
         return childPath;
      },

      name: function() { return this.ref()? this.ref().name() : '[dynamic path]'; },

      isDynamic: function() { return !this.ref(); },
      isIntersection: function() { return this.props.intersects; },
      isSortBy: function() { return this.props.sortBy; },
      ref: function() { return this.props.fbRef; },
      toString: function() { return this.pathName; },
      hasKey: function(key) { return (this.keyMap||{}).hasOwnProperty(key); },
      isUnresolved: function() { return this.resolveFn !== null; },

      tryResolve: function(snap) {
         var ref = this.resolveFn(snap);
         if( ref ) {
            this.props.fbRef = ref;
            this.resolveFn = null;
            this.pathName = buildPathName(this.props);
         }
         return !!ref;
      },

      on: function(event) {
         if( !this.isDynamic() && !this.subs[event] ) {
            var fn = fb.util.bind(this._sendEvent, this, event);
            this.subs[event] = this.props.fbRef.on(event, fn, function(err) {
               fb.log.error(err);
            });
         }
      },

      off: function(event) {
         if( !this.isDynamic() && this.subs[event] ) {
            this.props.fbRef.off(event, this.subs[event]);
            delete this.subs[event];
         }
      },

      /**
       * Unless keyMap is passed in the config, it will be empty until the first data set is fetched!
       * @returns {Object} a hash
       */
      getKeyMap: function() { return this.props.keyMap; },

      _sendEvent: function(event, snap, prevChild) {
         if( fb.util.isEmpty(this.keyMap) ) {
            this._setKeyMap(snap);
         }
         this.rec._pathEvent(this, snap, this.ref().name(), event, this.keyMap, prevChild);
      },

      _setKeyMap: function(snap) {
         var km = this.keyMap = {};
         fb.util.each(snap.val(), function(v, k) { km[k] = k; });
      }
   };

   /** UTILS
    ***************************************************/

   function buildPathName(props) {
      var n = '[no ref found]';
      if( props.fbRef ) {
         n = props.fbRef.toString();
      }
      else if( props.ref ) {
         n = '[dynamically generated path]';
      }
      return n;
   }

   function buildPathProps(props) {
      if( props instanceof Firebase ) {
         props = (function(ref) {
            return {
               fbRef: ref,
               ref: function(key) { return ref.child(key); }
            }
         })(props);
      }
      else if( typeof(props) === 'function' ) {
         props = { fbRef: null, ref: props };
      }
      else {
         props = (function(props) {
            var ref = props.ref;
            return fb.util.extend({}, props, {fbRef: typeof(ref) !== 'function'? ref : null});
         })(props);
      }
      return fb.util.extend({ intersects: false, ref: null, fbRef: null, keyMap: {}, sortBy: false }, props);
   }


   join.Path = Path;

})(fb);