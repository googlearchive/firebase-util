(function (exports, fb) {
   var undefined;
   var util = fb.pkg('util');

   /** Observer
    ***************************************************
    * @private
    * @constructor
    */
   function Observer(event, notifyFn, context, cancelFn) {
      if( typeof(notifyFn) !== 'function' ) {
         throw new Error('Must provide a valid notifyFn');
      }
      this.fn = notifyFn;
      this.event = event;
      this.cancelFn = cancelFn||function() {};
      this.context = context;
   }

   Observer.prototype = {
      notify: function() {
         var args = util.toArray(arguments);
         this.fn.apply(this.context, args);
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