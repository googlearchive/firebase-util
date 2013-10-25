var assert = require('chai').assert;

describe('global.js', function() {
   var undefined;
   var util = require('../firebase-utils.js')._ForTestingOnly.util;

   describe('#isObject', function() {
      it('should be true for {}', function() {
         assert.strictEqual( util.isObject({}), true);
      });

      it('should be true for {hello: "world"}', function() {
         assert.strictEqual( util.isObject({ hello: "world" }), true);
      });

      it('should be true for new Date', function() {
         assert.strictEqual( util.isObject(new Date()), true);
      });
      
      it('should return true for []', function() {
         assert.strictEqual( util.isObject([]), true);
      });

      it('should be false for null', function() {
         assert.strictEqual( util.isObject(null), false);
      });

      it('should be false for "hello"', function() {
         assert.strictEqual( util.isObject("hello"), false);
      });

      it('should be false for 1', function() {
         assert.strictEqual( util.isObject(1), false);
      });

      it('should be false for undefined', function() {
         assert.strictEqual( util.isObject(undefined), false );
      });
   });

   describe('#isArray', function() {
      it('should be false for {}', function() {
         assert.strictEqual( util.isArray({}), false);
      });

      it('should be false for new Date', function() {
         assert.strictEqual( util.isArray(new Date()), false);
      });

      it('should return true for []', function() {
         assert.strictEqual( util.isArray([]), true);
      });

      it('should return true for ["apple"]', function() {
         assert.strictEqual( util.isArray(["apple"]), true);
      });

      it('should be false for null', function() {
         assert.strictEqual( util.isArray(null), false);
      });

      it('should be false for "hello"', function() {
         assert.strictEqual( util.isArray("hello"), false);
      });

      it('should be false for 1', function() {
         assert.strictEqual( util.isArray(1), false);
      });

      it('should be false for undefined', function() {
         assert.strictEqual( util.isArray(undefined), false );
      });
   });

   describe('#extend', function() {
      it('should work for merging objects', function() {
         assert.deepEqual(util.extend({happy: 'happy'}, {'joy': 'joy'}), {happy: 'happy', joy: 'joy'});
      });

      it('should return the first argument', function() {
         var firstArg = {};
         assert.strictEqual(util.extend(firstArg, {'joy': 'joy'}), firstArg);
      });

      it('should not fail if a non-object is passed in', function() {
         assert.deepEqual(util.extend({happy: 'happy'}, null, 5, true, {'joy': 'joy'}), {happy: 'happy', joy: 'joy'});
      });

      it('should work for many objects', function() {
         assert.deepEqual(util.extend({}, {one: 1}, {two: 2}, {three: {thirty: 30}}, {four: 4}), {one: 1, two: 2, three: {thirty: 30}, four: 4});
      });

      it('should recursively merge if true is passed as first arg', function() {
         assert.deepEqual(util.extend(true, {a: {one: 1}, b: 2}, {a: {two: 2}, b: 22}), {a: {one: 1, two: 2}, b: 22});
      });
   });

   describe('#bind', function() {
      it('should set `this` appropriately', function() {
         var obj = {hello: 'world'};
         function tryBind() {
            return this.hello;
         }
         assert.strictEqual(util.bind(tryBind, obj)(), 'world');
      });

      it('should work with arguments', function() {
         var obj = {hello: 'world'};
         function tryBind(a) {
            return a+' '+this.hello;
         }
         assert.strictEqual(util.bind(tryBind, obj, 'hello')(), 'hello world');
      });

      it('should work with null scope', function() {
         function tryBind(a, b) {
            return a+' '+b;
         }
         assert.strictEqual(util.bind(tryBind, null, 'hello', 'world')(), 'hello world');
      });
   });

   describe('#each', function() {
      it('should iterate an array', function() {
         var vals = ['a', 'b', 'c'];
         var ct = 0;
         util.each(vals, function(v, k) {
            assert.strictEqual(k, ct, 'correct index returned on each iteration');
            assert.strictEqual(v, vals[k], 'correct value at each iteration');
            ct++;
         });
         assert.strictEqual(ct, vals.length, 'all values were iterated');
      });

      it('should iterate an empty array', function() {
         var ct = 0;
         util.each([], function() { ct++; });
         assert.strictEqual(ct, 0, 'no values iterated');
      });

      it('should iterate an object', function() {
         var vals = {one: 0, two: 1, three: 2};
         var ct = 0;
         util.each(vals, function(v, k) {
            assert.strictEqual(v, ct, 'has correct value at each iteration');
            assert.strictEqual(vals[k], ct, 'has correct key at each iteration');
            ct++;
         });
         assert.strictEqual(ct, 3, 'all values iterated');
      });

      it('should iterate an empty object', function() {
         var ct = 0;
         util.each({}, function() { ct++; });
         assert.strictEqual(ct, 0, 'no values iterated');
      });

      it('should iterate arguments object', function(){
         var ct = 0;
         var args = ['a', 'b', 'c'];
         function itList() {
            util.each(arguments, function(v,i) {
               assert.strictEqual(i, ct, 'correct index returned on each iteration');
               assert.strictEqual(v, args[i], 'correct value at each iteration');
               ct++;
            });
            assert.strictEqual(ct, args.length, 'all arguments iterated');
         }
         itList.apply(null, args);
      });
   });

   describe('#keys', function() {
      it('should iterate array', function() {
         assert.deepEqual(util.keys(['a', 'b', 'c']), [0, 1, 2]);
      });

      it('should iterate object', function() {
         assert.deepEqual(util.keys({foo: 'hello', bar: 'world'}), ['foo', 'bar']);
      });

      it('should not fail with null', function() {
         assert.deepEqual(util.keys(null), []);
      });
   });

   describe('#map', function() {
       it('should iterate array', function() {
          var res = util.map([1, 2, 3], function(v, k) { return v*2; });
          assert.deepEqual(res, [2, 4, 6]);
       });

      it('should iterate objects', function() {
         var res = util.map({foo: 'bar'}, function(v, k) { return k; });
         assert.deepEqual(res, ['foo']);
      });

      it('should not fail with null', function() {
         var res = util.map(null, function(v, k) { return 'oops'; });
         assert.deepEqual(res, []);
      });
   });

   describe('#indexOf', function() {
      it('should return -1 if not found', function() {
         assert.strictEqual(util.indexOf(['a', 'b', 'c'], 2), -1);
      });

      it('should return correct index if found', function() {
         assert.strictEqual(util.indexOf(['a', 'b', 'c'], 'c'), 2);
      });
   });

   describe('#isEmpty', function() {
      it('returns true for empty array', function() {
         assert.isTrue(util.isEmpty([]));
      });

      it('returns false for full array', function() {
         assert.isFalse(util.isEmpty([null]));
      });

      it('returns true for empty object', function() {
         assert.isTrue(util.isEmpty({}));
      });

      it('returns false for full object', function() {
         assert.isFalse(util.isEmpty({foo: 'bar'}));
      });

      it('returns false for a primitive value', function() {
         assert.isFalse(util.isEmpty(0));
      });

      it('returns true for null', function() {
         assert.isTrue(util.isEmpty(null));
      });

      it('returns true for undefined', function() {
         assert.isTrue(util.isEmpty());
      });
   });

   describe('#find', function() {
      it('passes a value and index for arrays', function() {
         util.find(['foo'], function(v, k) {
            assert.strictEqual(v, 'foo', 'expected "foo"');
            assert.strictEqual(k, 0, 'expected zero');
         });
      });

      it('passes a value and a key for objects', function() {
         util.find({foo: 'bar'}, function(v, k) {
            assert.strictEqual(v, 'bar', 'expected "bar"');
            assert.strictEqual(k, 'foo', 'expected "foo""');
         });
      });

      it('finds an item in an array', function() {
         var res = util.find(['foo', 'bar'], function(v) { return v === 'bar'; });
         assert.strictEqual(res, 'bar');
      });

      it('finds an item in an object', function() {
         var res = util.find({'foo': 'bar', 'hello': 'world'}, function(v, k) {
            return k === 'hello';
         });
         assert.strictEqual(res, 'world');
      });

      it('returns undefined if no item found in array', function() {
         var res = util.find(['foo', 'bar'], function() { return false; });
         assert.strictEqual(res, undefined);
      });

      it('returns undefined if no item found in object', function() {
         var res = util.find({'foo': 'bar'}, function() { return false; });
         assert.strictEqual(res, undefined);
      });
   });

   describe('#defer', function() {
      it('should get invoked', function(done) {
         util.defer(done);
      });

      it('should not be invoked synchronously', function() {
         var called = false;
         util.defer(function() {
            called = true;
         });
         assert.isFalse(called);
      });
   });

   describe('#isEqual', function() {
      it('should return false for null vs {}', function() {
         assert.isFalse(util.isEqual(null, {}));
      });

      it('should return false for null vs 0', function() {
         assert.isFalse(util.isEqual(null, 0));
      });

      it('should return false for null vs undefined', function() {
         assert.isFalse(util.isEqual(null, undefined));
      });

      it('should return true for null,null', function() {
         assert.isTrue(util.isEqual(null, null));
      });

      it('should return true for {} vs {}', function() {
         assert.isTrue(util.isEqual({}, {}));
      });

      it('should return true for {foo: "ffoo", bar: "barr"} vs {bar: "barr", foo: "ffoo"}', function() {
         assert.isTrue(util.isEqual({foo: "ffoo", bar: "barr"}, {bar: "barr", foo: "ffoo"}));
      });

      it('should return true for {foo: "ffoo", bar: {barr: "barr"}} vs {bar: {barr: "barr"}, foo: "ffoo"}', function() {
         assert.isTrue(util.isEqual({foo: "ffoo", bar: {barr: "barr"}}, {bar: {barr: "barr"}, foo: "ffoo"}));
      });

      it('should return true for [] vs []', function() {
         assert.isTrue(util.isEqual([], []));
      });

      it('should return true for [1, 2, [3, 4]] vs [1, 2, [3, 4]]', function() {
         assert.isTrue(util.isEqual([1, 2, [3, 4]], [1, 2, [3, 4]]));
      });

      it('should return false for [1, 2, [3, "4"]] vs [1, 2, [3, 4]]', function() {
         assert.isTrue(util.isEqual([1, 2, [3, 4]], [1, 2, [3, 4]]));
      });

      it('should return true for 1,1', function() {
         assert.isTrue(util.isEqual(1,1));
      });

      it('should return false for 1,"1"', function() {
         assert.isFalse(util.isEqual(1,"1"));
      });

      it('should return false for [1] vs {0: 1}', function() {
         assert.isFalse(util.isEqual([1], {0: 1}));
      });
   });

   describe('#has', function() {
      it('should be tested');
   });

   describe('#contains', function() {
      it('should be tested');
   });

   describe('#inherit', function() {
      it('should be tested');
   });

   describe('#bindAll', function() {
      it('should be tested');
   });

});
