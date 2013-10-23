(function (exports, fb) {
   var undefined;
   var util = fb.pkg('util');

   function Observable(eventsMonitored) {
      var observers = this.observers = {};
      util.each(eventsMonitored, function(key) {
         observers[key] = [];
      });
   }
   Observable.prototype = {
      /**
       * @param {String|Array} event
       * @param {Function|util.Observer} callback
       * @param {Object} [scope]
       * @param {Function} [cancelFn]
       */
      observe: function(event, callback, scope, cancelFn) {
         var eventList = util.isArray(event)? event : [event];
         var obs = callback instanceof util.Observer? callback : new util.Observer(event, callback, scope, cancelFn);
         util.each(eventList, function(e) {
            if( !this.observers[e] ) {
               fb.log.warn('Invalid event type', e);
            }
            else {
               this.observers[e].push(obs);
               typeof(this.onObserverAdded) === 'function' && this.onObserverAdded(e, obs);
            }
         }, this);
         return obs;
      },

      hasAnyObservers: function(exclude) {
         if( !exclude ) { exclude = []; }
         return util.contains(this.observers, function(list, event) {
            return !util.contains(exclude, event) && this.hasObservers(event);
         }, this);
      },

      hasObservers: function(event) {
         return this.observers[event].length > 0;
      },

      /**
       * @param {String|Array} event
       * @param {Function|util.Observer} callback
       * @param {Object} [scope]
       */
      stopObserving: function(event, callback, scope) {
         if( !event ) { event = util.keys(this.observers); }
         if( util.isArray(event) ) {
            util.each(event, function(e) {
               this.stopObserving(e, callback, scope);
            }, this);
         }
         else {
            var removes = [];
            util.each(this.observers[event], function(obs) {
               if( obs.matches(event, callback, scope) ) {
                  obs.notifyCancelled(null, event, this);
                  removes.push(obs);
                  typeof(this.onObserverRemoved) === 'function' && this.onObserverRemoved(event, obs);
               }
            }, this);
            removeAll(this.observers[event], removes);
         }
      },

      triggerEvent: function(event) {
         var args = util.toArray(arguments, 1), observers = this.observers;
         util.each(util.isArray(event)? event : [event], function(e) {
            util.each(observers[e], function(obs) {
               obs.notify.apply(obs, args);
            });
         });
      }
   };

   function toArray(val) {
      return util.isArray(val)? val : [val];
   }

   function removeAll(list, items) {
      util.each(items, function(x) {
         var i = util.indexOf(list, x);
         if( i >= 0 ) {
            list.splice(i, 1);
         }
      });
   }

   util.Observable = Observable;
})(exports, fb);