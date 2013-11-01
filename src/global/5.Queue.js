(function (exports, fb) {
   var util = fb.pkg('util');

   function Queue(criteriaFunctions) {
      this.needs = criteriaFunctions.length;
      this.met = 0;
      this.queued = [];
      util.each(criteriaFunctions, this._addCriteria, this);
   }

   Queue.prototype = {
      _addCriteria: function(criteriaFn) {
         var scope = null;
         if( util.isArray(criteriaFn) ) {
            scope = criteriaFn[1];
            criteriaFn = criteriaFn[0];
         }
         criteriaFn.call(scope, util.bind(this._criteriaMet, this));
      },

      _criteriaMet: function() {
         this.met++;
         if( this.ready() ) {
            util.each(this.queued, this._run, this);
         }
      },

      _runOrStore: function(args) {
         if( this.ready() ) {
            this._run(args);
         }
         else {
            this.queued.push(args);
         }
      },

      _run: function(args) {
         args[0].apply(args[1], args.slice(2));
      },

      ready: function() {
         return this.needs === this.met;
      },

      addEvent: function(fn, context) {
         var args = util.toArray(arguments);
         this._runOrStore(args);
      }
   };

   util.createQueue = function(criteriaFns) {
      var queue = new Queue(criteriaFns);
      var fn = function(fn, context) {
         queue.addEvent.apply(queue, util.toArray(arguments));
      };
      fn.ready = queue.ready;
      return fn;
   };
})(exports, fb);