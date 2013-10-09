
function MergedChild() {}
MergedChild.prototype = {
   on:              function() {},
   off:             function() {},
   once:            function() {},
   child:           function() {}, // returns a normal Firebase ref to child path
   parent:          function() {}, // returns the FirebaseJoin instance
   name:            function() {},
   set:             function() {}, // splits merged data and calls set on each record
   setWithPriority: function() {}, //todo?
   setPriority:     function() {}, //todo?
   update:          function() {}, // splits merged data adn calls update on each record
   remove:          function() {},
   limit:           function() {}, //todo throw Error?
   endAt:           function() {}, //todo throw Error?
   startAt:         function() {}, //todo throw Error?
   push:            function() {}, //todo throw error?
   root:            function() {},
   toString:        function() {},
   transaction:     function() {},
   onDisconnect:    function() {}  //todo?
};