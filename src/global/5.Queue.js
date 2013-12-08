(function (exports, fb) {
   var util = fb.pkg('util');

   function Queue(criteriaFunctions) {
      this.needs = 0;
      this.met = 0;
      this.queued = [];
      this.errors = [];
      this.criteria = [];
      this.processing = false;
      util.each(criteriaFunctions, this.addCriteria, this);
   }

   Queue.prototype = {
      /**
       * @param {Function} criteriaFn
       * @param {Object} [scope]
       */
      addCriteria: function(criteriaFn, scope) {
         if( this.processing ) {
            throw new Error('Cannot call addCriteria() after invoking done(), fail(), or handler() methods');
         }
         this.criteria.push(scope? [criteriaFn, scope] : criteriaFn);
         return this;
      },

      ready: function() {
         return this.needs === this.met;
      },

      done: function(fn, context) {
         fn && this._runOrStore(function() {
            this.hasErrors() || fn.call(context);
         });
         return this;
      },

      fail: function(fn, context) {
         this._runOrStore(function() {
            this.hasErrors() && fn.apply(context, this.getErrors());
         });
         return this;
      },

      handler: function(fn, context) {
         this._runOrStore(function() {
            fn.apply(context, this.hasErrors()? this.getErrors() : [null]);
         });
         return this;
      },

      /**
       * @param {Queue} queue
       */
      chain: function(queue) {
         this.addCriteria(queue.handler, queue);
         return this;
      },

      when: function(def) {
         this._runOrStore(function() {
            if( this.hasErrors() ) {
               def.reject.apply(def, this.getErrors());
            }
            else {
               def.resolve();
            }
         });
      },

      addError: function(e) {
         this.errors.push(e);
      },

      hasErrors: function() {
         return this.errors.length;
      },

      getErrors: function() {
         return this.errors.slice(0);
      },

      _process: function() {
         this.processing = true;
         this.needs = this.criteria.length;
         util.each(this.criteria, this._evaluateCriteria, this);
      },

      _evaluateCriteria: function(criteriaFn) {
         var scope = null;
         if( util.isArray(criteriaFn) ) {
            scope = criteriaFn[1];
            criteriaFn = criteriaFn[0];
         }
         try {
            criteriaFn.call(scope, util.bind(this._criteriaMet, this));
         }
         catch(e) {
            this.addError(e);
         }
      },

      _criteriaMet: function(error) {
         error && this.addError(error);
         this.met++;
         if( this.ready() ) {
            util.each(this.queued, this._run, this);
         }
      },

      _runOrStore: function(fn) {
         this.processing || this._process();
         if( this.ready() ) {
            this._run(fn);
         }
         else {
            this.queued.push(fn);
         }
      },

      _run: function(fn) {
         fn.call(this);
      }
   };

   util.createQueue = function(criteriaFns, callback) {
      var q = new Queue(criteriaFns);
      callback && q.done(callback);
      return q;
   };
})(exports, fb);