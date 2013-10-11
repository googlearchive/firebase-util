var assert = require('chai').assert;
var undefined;

describe('globals.js', function() {
   var fbutil = require('../fbutil.js')._fbutilObjectForTestingOnly;

   describe('#isObject', function() {
      it('should be true for {}', function() {
         assert.strictEqual( fbutil.isObject({}), true);
      });

      it('should be true for {hello: "world"}', function() {
         assert.strictEqual( fbutil.isObject({ hello: "world" }), true);
      });

      it('should be true for new Date', function() {
         assert.strictEqual( fbutil.isObject(new Date()), true);
      });
      
      it('should return true for []', function() {
         assert.strictEqual( fbutil.isObject([]), true);
      });

      it('should be false for null', function() {
         assert.strictEqual( fbutil.isObject(null), false);
      });

      it('should be false for "hello"', function() {
         assert.strictEqual( fbutil.isObject("hello"), false);
      });

      it('should be false for 1', function() {
         assert.strictEqual( fbutil.isObject(1), false);
      });

      it('should be false for undefined', function() {
         assert.strictEqual( fbutil.isObject(undefined), false );
      });
   });

   describe('#isArray', function() {
      it('should be false for {}', function() {
         assert.strictEqual( fbutil.isArray({}), false);
      });

      it('should be false for new Date', function() {
         assert.strictEqual( fbutil.isArray(new Date()), false);
      });

      it('should return true for []', function() {
         assert.strictEqual( fbutil.isArray([]), true);
      });

      it('should return true for ["apple"]', function() {
         assert.strictEqual( fbutil.isArray(["apple"]), true);
      });

      it('should be false for null', function() {
         assert.strictEqual( fbutil.isArray(null), false);
      });

      it('should be false for "hello"', function() {
         assert.strictEqual( fbutil.isArray("hello"), false);
      });

      it('should be false for 1', function() {
         assert.strictEqual( fbutil.isArray(1), false);
      });

      it('should be false for undefined', function() {
         assert.strictEqual( fbutil.isArray(undefined), false );
      });
   });

   describe('#extend', function() {
      it('should work for merging objects', function() {
         assert.deepEqual(fbutil.extend({happy: 'happy'}, {'joy': 'joy'}), {happy: 'happy', joy: 'joy'});
      });

      it('should return the first argument', function() {
         var firstArg = {};
         assert.strictEqual(fbutil.extend(firstArg, {'joy': 'joy'}), firstArg);
      });

      it('should not fail if a non-object is passed in', function() {
         assert.deepEqual(fbutil.extend({happy: 'happy'}, null, 5, true, {'joy': 'joy'}), {happy: 'happy', joy: 'joy'});
      });

      it('should work for many objects', function() {
         assert.deepEqual(fbutil.extend({}, {one: 1}, {two: 2}, {three: {thirty: 30}}, {four: 4}), {one: 1, two: 2, three: {thirty: 30}, four: 4});
      });
   });

   describe('#bind', function() {
      it('should set `this` appropriately', function() {
         var obj = {hello: 'world'};
         function tryBind() {
            return this.hello;
         }
         assert.strictEqual(fbutil.bind(tryBind, obj)(), 'world');
      });

      it('should work with arguments', function() {
         var obj = {hello: 'world'};
         function tryBind(a) {
            return a+' '+this.hello;
         }
         assert.strictEqual(fbutil.bind(tryBind, obj, 'hello')(), 'hello world');
      });

      it('should work with null scope', function() {
         function tryBind(a, b) {
            return a+' '+b;
         }
         assert.strictEqual(fbutil.bind(tryBind, null, 'hello', 'world')(), 'hello world');
      });
   });

   describe('#each', function() {
      it('should iterate an array', function() {
         var vals = ['a', 'b', 'c'];
         var ct = 0;
         fbutil.each(vals, function(v, k) {
            assert.strictEqual(k, ct, 'correct index returned on each iteration');
            assert.strictEqual(v, vals[k], 'correct value at each iteration');
            ct++;
         });
         assert.strictEqual(ct, vals.length, 'all values were iterated');
      });

      it('should iterate an empty array', function() {
         var ct = 0;
         fbutil.each([], function() { ct++; });
         assert.strictEqual(ct, 0, 'no values iterated');
      });

      it('should iterate an object', function() {
         var vals = {one: 0, two: 1, three: 2};
         var ct = 0;
         fbutil.each(vals, function(v, k) {
            assert.strictEqual(v, ct, 'has correct value at each iteration');
            assert.strictEqual(vals[k], ct, 'has correct key at each iteration');
            ct++;
         });
         assert.strictEqual(ct, 3, 'all values iterated');
      });

      it('should iterate an empty object', function() {
         var ct = 0;
         fbutil.each({}, function() { ct++; });
         assert.strictEqual(ct, 0, 'no values iterated');
      });

      it('should iterate arguments object', function(){
         var ct = 0;
         var args = ['a', 'b', 'c'];
         function itList() {
            fbutil.each(arguments, function(v,i) {
               console.log('iteration', ct, v, i);
               assert.strictEqual(i, ct, 'correct index returned on each iteration');
               assert.strictEqual(v, args[i], 'correct value at each iteration');
               ct++;
            });
            assert.strictEqual(ct, args.length, 'all arguments iterated');
         }
         itList.apply(null, args);
      });
   });

});
