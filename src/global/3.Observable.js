(function (exports, fb) {
   var log  = fb.pkg('log');
   var util = fb.pkg('util');

   /**
    * A simple observer model for watching events.
    * @param eventsMonitored
    * @param [opts] can contain callbacks for onAdd, onRemove, and onEvent
    * @constructor
    */
   function Observable(eventsMonitored, opts) {
      opts || (opts = {});
      this._observableProps = util.extend(
         { observers: {}, onAdd: util.noop, onRemove: util.noop, onEvent: util.noop },
         opts,
         { eventsMonitored: eventsMonitored }
      );
      this.resetObservers();
   }
   Observable.prototype = {
      /**
       * @param {String} event
       * @param {Function|util.Observer} callback
       * @param {Function} [cancelFn]
       * @param {Object} [scope]
       */
      observe: function(event, callback, cancelFn, scope) {
         var args = util.Args('observe', arguments, 2, 4);
         event = args.nextFromWarn(this._observableProps.eventsMonitored);
         if( event ) {
            callback = args.nextReq('function');
            cancelFn = args.next('function');
            scope = args.next('object');
            var obs = new util.Observer(event, callback, scope, cancelFn);
            if( !util.has(this._observableProps.observers, event) ) {
               log.warn('Observable.observe: invalid event type %s', event);
            }
            else {
               this._observableProps.observers[event].push(obs);
               this._observableProps.onAdd(event, obs);
            }
         }
         return obs;
      },

      /**
       * @param {String|Array} [event]
       * @returns {boolean}
       */
      hasObservers: function(event) {
         return this.getObservers(event).length > 0;
      },

      /**
       * @param {String|Array} events
       * @param {Function|util.Observer} callback
       * @param {Object} [scope]
       */
      stopObserving: function(events, callback, scope) {
         var args = util.Args('stopObserving', arguments);
         events = args.next(['array', 'string'], this._observableProps.eventsMonitored);
         callback = args.next(['function']);
         scope = args.next(['object']);
         util.each(events, function(event) {
            var removes = [];
            var observers = this.getObservers(event);
            util.each(observers, function(obs) {
               if( obs.matches(event, callback, scope) ) {
                  obs.notifyCancelled(null);
                  removes.push(obs);
               }
            }, this);
            removeAll(this._observableProps.observers[event], removes);
            this._observableProps.onRemove(event, removes);
         }, this);
      },

      /**
       * Turn off all observers and call cancel callbacks with an error
       * @param {String} error
       * @returns {*}
       */
      abortObservers: function(error) {
         var removes = [];
         if( this.hasObservers() ) {
            var observers = this.getObservers().slice();
            util.each(observers, function(obs) {
               obs.notifyCancelled(error);
               removes.push(obs);
            }, this);
            this.resetObservers();
            this._observableProps.onRemove(this.event, removes);
         }
      },

      /**
       * @param {String|Array} [events]
       * @returns {*}
       */
      getObservers: function(events) {
         events = util.Args('getObservers', arguments).listFrom(this._observableProps.eventsMonitored, true);
         return getObserversFor(this._observableProps.observers, events);
      },

      triggerEvent: function(event) {
         var args = util.Args('triggerEvent', arguments);
         var events = args.listFromWarn(this._observableProps.eventsMonitored, true);
         var passThruArgs = args.restAsList();
         if( events ) {
            util.each(events, function(e) {
               var observers = this.getObservers(e), ct = 0;
   //            log('triggering %s for %d observers with args', event, observers.length, args, onEvent);
               util.each(observers, function(obs) {
                  obs.notify.apply(obs, passThruArgs);
                  ct++;
               });
               this._observableProps.onEvent.apply(null, [e, ct].concat(passThruArgs));
            }, this);
         }
      },

      resetObservers: function() {
         util.each(this._observableProps.eventsMonitored, function(key) {
            this._observableProps.observers[key] = [];
         }, this);
      }
   };

   function removeAll(list, items) {
      util.each(items, function(x) {
         var i = util.indexOf(list, x);
         if( i >= 0 ) {
            list.splice(i, 1);
         }
      });
   }

   function getObserversFor(allObservers, events) {
      var out = [];
      util.each(events, function(event) {
         if( !util.has(allObservers, event) ) {
            log.warn('Observable.hasObservers: invalid event type %s', event);
         }
         else if( allObservers[event].length ) {
            out = out.concat(allObservers[event]);
         }
      }, this);
      return out;
   }

   util.Observable = Observable;
})(exports, fb);