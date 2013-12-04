(function (exports, fb) {
   var undefined;
   var util = fb.pkg('util');

   /** Observer
    ***************************************************
    * @private
    * @constructor
    */
   function Observer(observable, event, notifyFn, context, cancelFn, oneTimeEvent) {
      if( typeof(notifyFn) !== 'function' ) {
         throw new Error('Must provide a valid notifyFn');
      }
      this.observable = observable;
      this.fn = notifyFn;
      this.event = event;
      this.cancelFn = cancelFn||function() {};
      this.context = context;
      this.oneTimeEvent = !!oneTimeEvent;
   }

   Observer.prototype = {
      notify: function() {
         var args = util.toArray(arguments);
         this.fn.apply(this.context, args);
         if( this.oneTimeEvent ) {
            this.observable.stopObserving(this.event, this.fn, this.context);
         }
      },

      matches: function(event, fn, context) {
         if( util.isArray(event) ) {
            return util.contains(event, function(e) {
               return this.matches(e, fn, context);
            }, this);
         }
         return (!event || event === this.event)
            && (!fn || fn === this || fn === this.fn)
            && (!context || context === this.context);
      },

      notifyCancelled: function(err) {
         this.cancelFn.call(this.context, err||null, this);
      }
   };

   util.Observer = Observer;

})(exports, fb);