'use strict';

var Ref = require('../../src/NormalizedCollection/libs/Ref.js');
var Query = require('../../src/NormalizedCollection/libs/Query.js');

describe('Ref', function() {
  describe('<constructor>', function() {
    it('should inherit Query', function() {
      var ref = new Ref(stubRec());
      expect(ref).toBeInstanceOf(Query);
    });

    //todo-test
  });

  describe('auth', function () {
    it('should have tests'); //todo-test
  });
  
  describe('unauth', function () {
    it('should have tests'); //todo-test
  });
  
  describe('child', function () {
    it('should have tests'); //todo-test
  });
  
  describe('parent', function () {
    it('should have tests'); //todo-test
  });
  
  describe('root', function () {
    it('should have tests'); //todo-test
  });
  
  describe('name', function () {
    it('should have tests'); //todo-test
  });
  
  describe('toString', function () {
    it('should have tests'); //todo-test
  });
  
  describe('set', function () {
    it('should have tests'); //todo-test
  });
  
  describe('update', function () {
    it('should have tests'); //todo-test
  });
  
  describe('remove', function () {
    it('should have tests'); //todo-test
  });
  
  describe('push', function () {
    it('should have tests'); //todo-test
  });
  
  describe('setWithPriority', function () {
    it('should have tests'); //todo-test
  });
  
  describe('setPriority', function () {
    it('should have tests'); //todo-test
  });
  
  describe('transaction', function () {
    it('should have tests'); //todo-test
  });
  
  describe('goOffline', function () {
    it('should have tests'); //todo-test
  });
  
  describe('goOnline', function () {
    it('should have tests'); //todo-test
  });

  function stubRec() {
    var rec = jasmine.createSpyObj('RecordStub', ['getPathMgr']);
    var mgr = jasmine.createSpyObj('PathManagerStub', ['getPath']);
    mgr.paths = [stubPath()];
    rec.getPathMgr.and.callFake(function() {
      return mgr;
    });
    return rec;
  }

  function stubPath() {
    var path = jasmine.createSpyObj('PathStub', ['name', 'id', 'url']);
    path.name.and.callFake(function() { return 'path1'; });
    path.id.and.callFake(function() { return 'path1'; });
    path.url.and.callFake(function() { return 'Mock://path1'; });
    return path;
  }

});