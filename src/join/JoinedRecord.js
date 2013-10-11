function JoinedRecord() {}

JoinedRecord.prototype =
(function(exports, fbutil) {
   "use strict";

   return {
      //todo sorting?

      auth:            function() {}, // wrap
      unauth:          function() {}, // wrap
      on:              function() {},
      off:             function() {},
      once:            function() {},
      child:           function() {},
      parent:          function() {},
      name:            function() {},
      set:             function() {},
      setWithPriority: function() {},
      setPriority:     function() {},
      update:          function() {},
      remove:          function() {},
      limit:           function() {}, // throw Error
      endAt:           function() {}, // throw Error
      startAt:         function() {}, // throw Error
      push:            function() {},
      root:            function() {}, // wrap
      toString:        function() {},
      transaction:     function() {},
      onDisconnect:    function() {}, // throw error
      ref:             function() { return this; }
   };

})(exports, fbutil);
