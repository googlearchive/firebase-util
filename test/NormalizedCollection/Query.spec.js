'use strict';

var Query          = require('../../src/NormalizedCollection/libs/Query');
var Path           = require('../../src/NormalizedCollection/libs/Path');
var hp             = require('./helpers');
var _              = require('lodash');

describe('Query', function() {
  describe('#on', function () {
    it('calls Record.watch with the correct arguments', function() {
      var ref = hp.stubNormRef();
      var rec = ref.$getRecord();
      var q = new Query(ref, rec);
      var fn = function() {};
      var ctx = {};
      q.on('value', fn, null, ctx);
      expect(rec.watch).toHaveBeenCalledWith('value', fn, null, ctx);
    });
  });

  describe('#once', function () {
    it('calls Record.watch with the correct arguments', function() {
      var ref = hp.stubNormRef();
      var rec = ref.$getRecord();
      var q = new Query(ref, rec);
      var fn = function() {};
      var ctx = {};
      q.once('value', fn, null, ctx);
      expect(rec.watch).toHaveBeenCalledWith('value', jasmine.any(Function), null, q);
    });

    it('calls Record.unwatch after being invoked', function() {
      var ref = hp.stubNormRef();
      var rec = ref.$getRecord();
      var q = new Query(ref, rec);
      var spy = jasmine.createSpy('callback from once()');
      q.once('value', spy);
      var args = rec.watch.calls.argsFor(0);
      var callback = args[1];
      var ctx = args[3];
      callback.call(ctx, hp.stubNormSnap(hp.stubNormRef(), 99));
      expect(rec.unwatch).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#off', function () {
    it('calls Record.unwatch with the correct arguments', function() {
      var ref = hp.stubNormRef();
      var rec = ref.$getRecord();
      var q = new Query(ref, rec);
      function fn() {}
      q.off('value', fn);
      expect(rec.unwatch).toHaveBeenCalledWith('value', fn, undefined);
    });
  });

  describe('#orderByChild', function () {
    it('returns a Query', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var ref = hp.stubNormRef(paths);
      var q = new Query(ref, ref.$getRecord());
      expect(q.orderByChild('foo')).toBeInstanceOf(Query);
    });

    it('calls orderByChild on master ref', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var nref = hp.stubNormRef(paths);
      var masterRef = nref.$getRecord().getPathManager().first().ref();
      spyOn(masterRef, 'orderByChild').and.callThrough();
      var q = new Query(nref, nref.$getRecord());
      q.orderByChild('foo');
      expect(masterRef.orderByChild).toHaveBeenCalled();
    });

    //todo-test requires MockFirebase upgrade to 2.0, see https://github.com/katowulf/mockfirebase/issues/39
    it('returns results ordered by child');
  });

  describe('#orderByKey', function () {
    it('returns a Query', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var ref = hp.stubNormRef(paths);
      var q = new Query(ref, ref.$getRecord());
      expect(q.orderByKey()).toBeInstanceOf(Query);
    });

    it('calls orderByKey on master ref', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var nref = hp.stubNormRef(paths);
      var masterRef = nref.$getRecord().getPathManager().first().ref();
      spyOn(masterRef, 'orderByKey').and.callThrough();
      var q = new Query(nref, nref.$getRecord());
      q.orderByKey();
      expect(masterRef.orderByKey).toHaveBeenCalled();
    });
  });

  describe('#orderByPriority', function () {
    it('returns a Query', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var ref = hp.stubNormRef(paths);
      var q = new Query(ref, ref.$getRecord());
      expect(q.orderByPriority()).toBeInstanceOf(Query);
    });

    it('calls orderByPriority on master ref', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var nref = hp.stubNormRef(paths);
      var masterRef = nref.$getRecord().getPathManager().first().ref();
      spyOn(masterRef, 'orderByPriority').and.callThrough();
      var q = new Query(nref, nref.$getRecord());
      q.orderByPriority();
      expect(masterRef.orderByPriority).toHaveBeenCalled();
    });

    //todo-test requires MockFirebase upgrade to 2.0, see https://github.com/katowulf/mockfirebase/issues/39
    it('returns results ordered by priority'); //todo-test
  });

  describe('#limitToFirst', function () {
    it('returns a Query', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var ref = hp.stubNormRef(paths);
      var q = new Query(ref, ref.$getRecord());
      expect(q.limitToFirst()).toBeInstanceOf(Query);
    });

    it('calls limitToFirst on master ref', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var nref = hp.stubNormRef(paths);
      var masterRef = nref.$getRecord().getPathManager().first().ref();
      spyOn(masterRef, 'limitToFirst').and.callThrough();
      var q = new Query(nref, nref.$getRecord());
      q.limitToFirst();
      expect(masterRef.limitToFirst).toHaveBeenCalled();
    });

    //todo-test requires MockFirebase upgrade to 2.0, see https://github.com/katowulf/mockfirebase/issues/39
    it('returns the first n results'); //todo-test
  });

  describe('#limitToLast', function () {
    it('returns a Query', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var ref = hp.stubNormRef(paths);
      var q = new Query(ref, ref.$getRecord());
      expect(q.limitToLast()).toBeInstanceOf(Query);
    });

    it('calls limitToLast on master ref', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var nref = hp.stubNormRef(paths);
      var masterRef = nref.$getRecord().getPathManager().first().ref();
      spyOn(masterRef, 'limitToLast').and.callThrough();
      var q = new Query(nref, nref.$getRecord());
      q.limitToLast();
      expect(masterRef.limitToLast).toHaveBeenCalled();
    });

    //todo-test requires MockFirebase upgrade to 2.0, see https://github.com/katowulf/mockfirebase/issues/39
    it('returns the last n results'); //todo-test
  });

  describe('#limit', function () {
    it('returns a Query', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var ref = hp.stubNormRef(paths);
      var q = new Query(ref, ref.$getRecord());
      expect(q.limit()).toBeInstanceOf(Query);
    });

    it('calls limit on the master ref', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var nref = hp.stubNormRef(paths);
      var masterRef = nref.$getRecord().getPathManager().first().ref();
      spyOn(masterRef, 'limit').and.callThrough();
      var q = new Query(nref, nref.$getRecord());
      q.limit();
      expect(masterRef.limit).toHaveBeenCalled();
    });

    //todo-test requires MockFirebase upgrade to 2.0, see https://github.com/katowulf/mockfirebase/issues/39
    it('returns the last n results'); //todo-test
  });

  describe('#startAt', function () {
    it('returns a Query', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var ref = hp.stubNormRef(paths);
      var q = new Query(ref, ref.$getRecord());
      expect(q.startAt()).toBeInstanceOf(Query);
    });

    it('calls startAt on the master ref', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var nref = hp.stubNormRef(paths);
      var masterRef = nref.$getRecord().getPathManager().first().ref();
      spyOn(masterRef, 'startAt').and.callThrough();
      var q = new Query(nref, nref.$getRecord());
      q.startAt();
      expect(masterRef.startAt).toHaveBeenCalled();
    });

    //todo-test requires MockFirebase upgrade to 2.0, see https://github.com/katowulf/mockfirebase/issues/39
    it('starts at the right record'); //todo-test
  });

  describe('#endAt', function () {
    it('returns a Query', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var ref = hp.stubNormRef(paths);
      var q = new Query(ref, ref.$getRecord());
      expect(q.endAt()).toBeInstanceOf(Query);
    });

    it('calls endAt on the master ref', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var nref = hp.stubNormRef(paths);
      var masterRef = nref.$getRecord().getPathManager().first().ref();
      spyOn(masterRef, 'endAt').and.callThrough();
      var q = new Query(nref, nref.$getRecord());
      q.endAt();
      expect(masterRef.endAt).toHaveBeenCalled();
    });

    //todo-test requires MockFirebase upgrade to 2.0, see https://github.com/katowulf/mockfirebase/issues/39
    it('ends at the right record'); //todo-test
  });

  describe('#equalTo', function () {
    it('returns a Query', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var ref = hp.stubNormRef(paths);
      var q = new Query(ref, ref.$getRecord());
      expect(q.equalTo()).toBeInstanceOf(Query);
    });

    it('calls equalTo on the master ref', function() {
      // we need to use real paths or the Transmogrifier will fail
      // since it uses instanceof Path, so we'll inject them here
      var paths = _.map(hp.stubPaths(), function(p) {
        return new Path([p.ref(), p.name(), p.getDependency()]);
      });
      var nref = hp.stubNormRef(paths);
      var masterRef = nref.$getRecord().getPathManager().first().ref();
      spyOn(masterRef, 'equalTo').and.callThrough();
      var q = new Query(nref, nref.$getRecord());
      q.equalTo();
      expect(masterRef.equalTo).toHaveBeenCalled();
    });

    //todo-test requires MockFirebase upgrade to 2.0, see https://github.com/katowulf/mockfirebase/issues/39
    it('only returns records with that field equal'); //todo-test
  });

  describe('#ref', function () {
    it('returns the same ref used to create the Query', function() {
      var ref = {};
      var rec = {setRef: function() {}};
      var q = new Query(ref, rec);
      expect(q.ref()).toBe(ref);
    });
  });
});
