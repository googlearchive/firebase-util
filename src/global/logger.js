(function (exports, fb) {
   var undefined;

   var fakeConsole = {
      error: noop, warn: noop, info: noop, log: noop, debug: noop, time: noop, timeEnd: noop, group: noop, groupEnd: noop
   };


   var logger = function() {
      logger.log.apply(null, fb.util.toArray(arguments));
   };

   /**
    * @param {int} level use -1 to turn off all logging, use 5 for maximum debugging
    */
   exports.enableDebugging = logger.enableDebugging = function(level) {
      fb.util.each(['error', 'warn', 'info', 'log', 'debug'], function(k, i) {
         if( typeof(console) !== 'undefined' && level >= i ) {
            // binding is necessary to prevent IE 8/9 from having a spaz when
            // .apply and .call are used on console methods
            var fn = fb.util.bind(console[k==='debug'? 'log' : k], console);
            logger[k] = function() {
               var args = fb.util.toArray(arguments);
               if( typeof(arguments[0]) === 'string' && arguments[0].match(/(%s|%d|%j)/) ) {
                  args = printf(args);
               }
               fn.apply(typeof(console) === 'undefined'? fakeConsole : console, args);
            };
         }
         else {
            logger[k] = noop;
         }
      });
//      logger('enableDebugging: log level set to '+level);
   };

   function getDebugLevel() {
      var m;
      if( typeof(window) !== 'undefined' && window.location && window.location.search ) {
         m = window.location.search.match('\bdebugLevel=([0-9]+)\b');
      }
      return m? parseInt(m[1], 10) : 0;
   }

   function noop() { return true; }

   function printf() {
      var args = fb.util.toArray(arguments);
      var template = args.shift();
      var matches = template.match(/(%s|%d|%j)/g);
      matches && fb.util.each(matches.slice(1), function(m) {
         template.replace(m, format(args.shift()||null, m));
      });
      return [template].concat(args);
   }

   function format(v, type) {
      switch(type) {
         case '%d':
            return parseInt(v, 10);
         case '%j':
            return fb.util.isObject(v)? JSON.stringify(v) : v+'';
         case '%s':
            return v;
         default:
            return v;
      }
   }

   exports.enableDebugging(getDebugLevel());
   fb.log = logger;

})(exports, fb);