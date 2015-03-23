'use strict';

var NormalizedRef = require('../../src/NormalizedCollection/libs/NormalizedRef.js');
var Query         = require('../../src/NormalizedCollection/libs/Query.js');
var hp            = require('./helpers');
var _             = require('lodash');

describe('NormalizedRef', function() {
  describe('<constructor>', function() {
    it('inherits Query', function() {
      var ref = new NormalizedRef(hp.stubRec());
      expect(ref).toBeInstanceOf(Query);
    });
  });
  
  describe('child', function () {
    it('calls child on record and returns new Ref with that child', function() {
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec).child('foo');
      expect(rec.child).toHaveBeenCalledWith('foo');
      expect(ref.$getRecord()).toBe(rec.child('foo'));
    });

    it('sets original ref as its parent', function() {
      var rec = hp.stubRec();
      var parent = new NormalizedRef(rec);
      var child = parent.child('foo');
      expect(child.parent()).toBe(parent);
    });

    it('accepts slashes in the path and properly nests them', function() {
      var rec = hp.stubRec();
      var _child = rec.child;
      rec.child = function(k) {
        var c = _child(k);
        c.key = function() { return k; };
        return c;
      };
      var parent = new NormalizedRef(rec);
      var child = parent.child('foo/bar/baz');
      _.each(['baz', 'bar', 'foo'], function(test) {
        expect(child.key()).toBe(test);
        child = child.parent();
      });
    });
  });
  
  describe('parent', function () {
    it('returns null for the root ref', function() {
      expect(new NormalizedRef(hp.stubRec()).parent()).toBeNull();
    });

    it('returns parent if it is a child path', function() {
      var parent = new NormalizedRef(hp.stubRec());
      var child = parent.child('foo');
      expect(child.parent()).toBe(parent);
    });
  });
  
  describe('root', function () {
    it('returns same ref for the root ref', function() {
      var ref = new NormalizedRef(hp.stubRec());
      expect(ref.root()).toBe(ref);
    });

    it('returns parent for a direct child', function() {
      var parent = new NormalizedRef(hp.stubRec());
      var child = parent.child('foo');
      expect(child.root()).toBe(parent);
    });

    it('returns the root for a deeply nested child', function() {
      var parent = new NormalizedRef(hp.stubRec());
      var child = parent.child('foo/bar/baz/boo');
      expect(child.root()).toBe(parent);
    });
  });
  
  describe('key', function () {
    it('is the concatenated list of paths if more than one path', function() {
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec);
      var exp =
          '[' +
          _.map(
            rec.getPathManager().getPaths(),
            function(p) { return p.name(); })
            .join('][') +
          ']';
      expect(ref.key()).toBe(exp);
    });

    it('is the path name if there is only one path', function() {
      var rec = hp.stubRec(['p1']);
      var ref = new NormalizedRef(rec);
      expect(ref.key()).toBe(rec.getPathManager().first().name());
    });
  });
  
  describe('toString', function () {
    it('is the concatenated list of url if more than one path', function() {
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec);
      var exp =
        '[' +
        _.map(
          rec.getPathManager().getPaths(),
          function(p) { return p.url(); })
          .join('][') +
        ']';
      expect(ref.toString()).toBe(exp);
    });

    it('is the path url if there is only one path', function() {
      var rec = hp.stubRec(['p1']);
      var ref = new NormalizedRef(rec);
      expect(ref.toString()).toBe(rec.getPathManager().first().url());
    });
  });
  
  describe('set', function () {
    it('calls saveData on the record with isUpdate === false', function() {
      var cb = function() {};
      var ctx = {};
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec);
      ref.set({foo: 'bar'}, cb, ctx);
      expect(rec.saveData).toHaveBeenCalledWith(
        {foo: 'bar'},
        jasmine.objectContaining({isUpdate: false, callback: cb, context: ctx})
      );
    });
  });
  
  describe('update', function () {
    it('calls saveData on the record with isUpdate === true', function() {
      var cb = function() {};
      var ctx = {};
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec);
      ref.update({foo: 'bar'}, cb, ctx);
      expect(rec.saveData).toHaveBeenCalledWith(
        {foo: 'bar'},
        jasmine.objectContaining({isUpdate: true, callback: cb, context: ctx})
      );
    });
  });
  
  describe('remove', function () {
    it('calls saveData with null and isUpdate === false', function() {
      var cb = function() {};
      var ctx = {};
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec);
      ref.remove(cb, ctx);
      expect(rec.saveData).toHaveBeenCalledWith(
        null,
        jasmine.objectContaining({isUpdate: false, callback: cb, context: ctx})
      );
    });
  });
  
  describe('push', function () {
    it('returns a child with the new push id', function() {
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec);
      var mock = ref.$getMaster();
      var res = ref.push();
      expect(res.name()).toBe(mock._lastAutoId);
    });

    it('returns a child whose parent is the original ref', function() {
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec);
      var res = ref.push();
      expect(res.parent()).toBe(ref);
    });

    it('calls saveData() on child rec with isUpdate === false and correct data', function() {
      var dat = {foo: 'bar'};
      var cb = function() {};
      var ctx = {};
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec);
      var res = ref.push(dat, cb, ctx);
      expect(rec.child(res.name()).saveData).toHaveBeenCalledWith(dat, {
         callback: cb, context: ctx, isUpdate: false
      });
    });
  });
  
  describe('setWithPriority', function () {
    it('should call saveData with correct priority and isUpdate false', function() {
      var dat = {foo: 'bar'};
      var cb = function() {};
      var ctx = {};
      var pri = -9999;
      var rec = hp.stubRec();
      new NormalizedRef(rec).setWithPriority(dat, pri, cb, ctx);
      expect(rec.saveData).toHaveBeenCalledWith(dat, {
        callback: cb, context: ctx, isUpdate: false, priority: pri
      });
    });
  });
  
  describe('setPriority', function () {
    it('should call setPriority on the master', function() {
      var cb = function() {};
      var ctx = {};
      var pri = -9999;
      var rec = hp.stubRec();
      var ref = new NormalizedRef(rec);
      var master = ref.$getMaster();
      spyOn(master, 'setPriority');
      ref.setPriority(pri, cb, ctx);
      expect(master.setPriority).toHaveBeenCalledWith(
        pri, cb, ctx
      );
    });
  });
  
  describe('transaction', function () {
    it('should throw an error', function() {
      expect(function() {
        new NormalizedRef(hp.stubRec()).transaction(function() {}, function() {});
      }).toThrowError(Error);
    });
  });

  describe('onDisconnect', function() {
    it('should throw an error', function() {
      expect(function() {
        new NormalizedRef(hp.stubRec()).onDisconnect();
      }).toThrowError(Error);
    });
  });
  
  describe('goOffline', function () {
    it('should call goOffline() for all paths', function() {
      var rec = hp.stubRec();
      var paths = rec.getPathManager().getPaths();
      _.each(paths, function(p) {
        spyOn(p.ref(), 'goOffline');
      });
      new NormalizedRef(rec).goOffline();
      expect(paths.length).toBeGreaterThan(1);
      _.each(paths, function(p) {
        expect(p.ref().goOffline).toHaveBeenCalled();
      });
    });
  });
  
  describe('goOnline', function () {
    it('should call goOnline() for all paths', function() {
      var rec = hp.stubRec();
      var paths = rec.getPathManager().getPaths();
      _.each(paths, function(p) {
        spyOn(p.ref(), 'goOnline');
      });
      new NormalizedRef(rec).goOnline();
      expect(paths.length).toBeGreaterThan(1);
      _.each(paths, function(p) {
        expect(p.ref().goOnline).toHaveBeenCalled();
      });
    });
  });


  describe('auth', function () {
    it('calls auth() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'auth');
      new NormalizedRef(rec).auth('abc123');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('unauth', function () {
    it('calls unauth() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'unauth');
      new NormalizedRef(rec).unauth();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('authWithCustomToken', function () {
    it('calls authWithCustomToken() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'authWithCustomToken');
      new NormalizedRef(rec).authWithCustomToken('abc123');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('authAnonymously', function () {
    it('calls authAnonymously() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'authAnonymously');
      new NormalizedRef(rec).authAnonymously('abc123');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('authWithPassword', function () {
    it('calls authWithPassword() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'authWithPassword');
      new NormalizedRef(rec).authWithPassword('abc123');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('authWithOAuthPopup', function () {
    it('calls authWithOAuthPopup() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'authWithOAuthPopup');
      new NormalizedRef(rec).authWithOAuthPopup('abc123');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('authWithOAuthRedirect', function () {
    it('calls authWithOAuthRedirect() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'authWithOAuthRedirect');
      new NormalizedRef(rec).authWithOAuthRedirect('abc123');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('authWithOAuthToken', function () {
    it('calls authWithOAuthToken() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'authWithOAuthToken');
      new NormalizedRef(rec).authWithOAuthToken('abc123');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getAuth', function () {
    it('calls getAuth() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'getAuth');
      new NormalizedRef(rec).getAuth('abc123');
      expect(spy).toHaveBeenCalled();
    });

    it('returns the result of the master ref', function() {
      var exp = {foo: 'bar'};
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      spyOn(ref, 'getAuth').and.returnValue(exp);
      var res = new NormalizedRef(rec).getAuth('abc123');
      expect(res).toBe(exp);
    });
  });

  describe('onAuth', function () {
    it('calls onAuth() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var cb = function() {};
      var ctx = {};
      var spy = spyOn(ref, 'onAuth');
      new NormalizedRef(rec).onAuth(cb, ctx);
      expect(spy).toHaveBeenCalledWith(cb, ctx);
    });
  });

  describe('offAuth', function () {
    it('calls offAuth() on the master ref', function() {
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'offAuth');
      new NormalizedRef(rec).offAuth('abc123');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('createUser', function () {
    it('calls createUser() on the master ref', function() {
      var cb = function() {};
      var creds = {email: 'test@test.com', password: 'test'};
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'createUser');
      new NormalizedRef(rec).createUser(creds, cb);
      expect(spy).toHaveBeenCalledWith(creds, cb);
    });
  });

  describe('changePassword', function () {
    it('calls changePassword() on the master ref', function() {
      var cb = function() {};
      var creds = {email: 'test@test.com', oldPassword: 'test', newPassword: 'testy'};
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'changePassword');
      new NormalizedRef(rec).changePassword(creds, cb);
      expect(spy).toHaveBeenCalledWith(creds, cb);
    });
  });

  describe('removeUser', function () {
    it('calls removeUser() on the master ref', function() {
      var cb = function() {};
      var creds = {email: 'test@test.com', password: 'test'};
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'removeUser');
      new NormalizedRef(rec).removeUser(creds, cb);
      expect(spy).toHaveBeenCalledWith(creds, cb);
    });
  });

  describe('resetPassword', function () {
    it('calls resetPassword() on the master ref', function() {
      var cb = function() {};
      var creds = {email: 'test@test.com'};
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'resetPassword');
      new NormalizedRef(rec).resetPassword(creds, cb);
      expect(spy).toHaveBeenCalledWith(creds, cb);
    });
  });

  describe('changeEmail', function () {
    it('calls changeEmail() on the master ref', function() {
      var cb = function() {};
      var creds = {oldEmail: 'test@test.com', newEmail: 'testy@testy.com', password: 'test'};
      var rec = hp.stubRec();
      var ref = rec.getPathManager().first().ref();
      var spy = spyOn(ref, 'changeEmail');
      new NormalizedRef(rec).changeEmail(creds, cb);
      expect(spy).toHaveBeenCalledWith(creds, cb);
    });
  });

});