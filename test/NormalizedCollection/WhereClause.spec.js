'use strict';

var WC = require('../../src/NormalizedCollection/libs/WhereClause.js');
var OP = require('../../src/NormalizedCollection/libs/constants.js');

describe('WhereClause', function() {
  describe('#add', function() {
    it('should add criteria', function() {
      var wc = new WC();
      expect(wc.criteria.length).toBe(0);
      wc.add('foo', OP.EQUALS, true);
      expect(wc.criteria.length).toBe(1);
      var c = wc.criteria[0];
      expect(c.field).toBe('foo');
      expect(c.operator).toBe(OP.EQUALS);
      expect(c.test).toBeA('function');
    });
  });

  describe('#test', function() {
    describe('OP.EQUALS', function() {
      it('should match: false vs. false', function() {
        var wc = new WC();
        wc.add('foo', OP.EQUALS, false);
        expect(wc.test(snap(false))).toBe(true);
      });

      it('should match: 1 vs. 1', function() {
        var wc = new WC();
        wc.add('foo', OP.EQUALS, 1);
        expect(wc.test(snap(1))).toBe(true);
      });

      it('should match: "hello" vs. "hello"', function() {
        var wc = new WC();
        wc.add('foo', OP.EQUALS, 'hello');
        expect(wc.test(snap('hello'))).toBe(true);
      });

      it('should match: null vs undefined', function() {
        var wc = new WC();
        wc.add('foo', OP.EQUALS, null);
        expect(wc.test(snap())).toBe(true); // because null === undef for firebase
      });

      it('should not match: 1 vs "1"', function() {
        var wc = new WC();
        wc.add('foo', OP.EQUALS, "1");
        expect(wc.test(snap(1))).toBe(false);
      });

      it('should not match: false vs. "false"', function() {
        var wc = new WC();
        wc.add('foo', OP.EQUALS, false);
        expect(wc.test(snap('false'))).toBe(false);
      });

      it('should match on $key', function() {
        var wc = new WC();
        wc.add('$key', OP.EQUALS, 'rec');
        expect(wc.test(snap('false'))).toBe(true);
      });

      it('should not match if $key not equal to match', function() {
        var wc = new WC();
        wc.add('$key', OP.EQUALS, 'notamatch');
        expect(wc.test(snap(false))).toBe(false);
      });

      it('should match on $priority', function() {
        var wc = new WC();
        wc.add('$priority', OP.EQUALS, 1);
        expect(wc.test(snap(null, 1))).toBe(true);
      });

      it('should not match if $priority not equal to match', function() {
        var wc = new WC();
        wc.add('$priority', OP.EQUALS, 1);
        expect(wc.test(snap('false'))).toBe(false);
      });
    });

    describe('OP.NOT_EQUALS', function() {
      it('should not match: false vs. false', function() {
        var wc = new WC();
        wc.add('foo', OP.NOT_EQUALS, false);
        expect(wc.test(snap(false))).toBe(false);
      });

      it('should not match: 1 vs. 1', function() {
        var wc = new WC();
        wc.add('foo', OP.NOT_EQUALS, 1);
        expect(wc.test(snap(1))).toBe(false);
      });

      it('should not match: "hello" vs. "hello"', function() {
        var wc = new WC();
        wc.add('foo', OP.NOT_EQUALS, 'hello');
        expect(wc.test(snap('hello'))).toBe(false);
      });

      it('should not match: null vs undefined', function() {
        var wc = new WC();
        wc.add('foo', OP.NOT_EQUALS, null);
        expect(wc.test(snap())).toBe(false); // because undef === null in Firebase
      });

      it('should match: 1 vs "1"', function() {
        var wc = new WC();
        wc.add('foo', OP.NOT_EQUALS, "1");
        expect(wc.test(snap(1))).toBe(true);
      });

      it('should match: false vs. "false"', function() {
        var wc = new WC();
        wc.add('foo', OP.NOT_EQUALS, false);
        expect(wc.test(snap('false'))).toBe(true);
      });
    });

    describe('OP.NULL', function() {
      it('should match null', function() {
        var wc = new WC();
        wc.add('foo', OP.NULL);
        expect(wc.test(snap(null))).toBe(true);
      });

      it('should match undefined', function() {
        var wc = new WC();
        wc.add('foo', OP.NULL);
        expect(wc.test(snap())).toBe(true);
      });

      it('should not match false', function() {
        var wc = new WC();
        wc.add('foo', OP.NULL);
        expect(wc.test(snap(false))).toBe(false);
      });

      it('should not match 1', function() {
        var wc = new WC();
        wc.add('foo', OP.NULL);
        expect(wc.test(snap(1))).toBe(false);
      });

      it('should work for $priority', function() {
        var wc = new WC();
        wc.add('$priority', OP.NULL);
        expect(wc.test(snap(1))).toBe(true);
      });

      it('should not match a non-null $priority', function() {
        var wc = new WC();
        wc.add('$priority', OP.NULL);
        expect(wc.test(snap(1, 0))).toBe(false);
      });

      it('should not match $key (never null)', function() {
        var wc = new WC();
        wc.add('$key', OP.NULL);
        expect(wc.test(snap(1))).toBe(false);
      });
    });

    describe('OP.NOT_NULL', function() {
      it('should have tests'); //todo-test
    });

    describe('OP.GT', function() {
      it('should have tests'); //todo-test
    });

    describe('OP.GTE', function() {
      it('should have tests'); //todo-test
    });

    describe('OP.LT', function() {
      it('should have tests'); //todo-test
    });

    describe('OP.LTE', function() {
      it('should have tests'); //todo-test
    });

    describe('OP.FUNCTION', function() {
      it('should have tests'); //todo-test
    });

    it('should match multiple criteria'); //todo-test

    it('should fail if any of multiple criteria are not a match'); //todo-test
  });

  function snap(val, pri) {
    var ref = mockRef('rec');
    var data = {foo: val};
    if( arguments.length < 1 ) { data = {}; }
    if( arguments.length < 2 ) { pri = null; }
    return {
      ref: function() { return ref; },
      name: function() { return ref.name(); },
      val: function() { return data; },
      getPriority: function() { return pri },
      forEach: function(cb, ctx) {
        util.each(val, cb, ctx);
      },
      child: function(key) {
        return snap(ref.child(key), util.has(val, key)? val[key] : null);
      }
    };
  }

  function mockRef(name) {
    var obj = {
      name: function() { return name; },
      ref: function() { return obj; },
      child: function(name) { return mockRef(name); }
    };
    return obj;
  }
});