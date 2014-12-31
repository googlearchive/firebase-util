'use strict';

var Query         = require('../../src/NormalizedCollection/libs/Query');
var hp            = require('./helpers');
var _             = require('lodash');

describe('Query', function() {
  describe('#on', function () {
    describe('value', function() {
      it('triggers when Record fires a value event'); //todo-test

      it('passes a NormalizedSnapshot to the callback'); //todo-test

      it('returns the merged value'); //todo-test
    });

    describe('child_added', function () {
      it('triggers when Record fires a child_added event'); //todo-test

      it('passes a Normalized snapshot to the callback'); //todo-test

      it('contains the merged value'); //todo-test
    });

    describe('child_changed', function () {
      it('triggers when Record fires a child_changed event'); //todo-test

      it('passes a Normalized snapshot to the callback'); //todo-test

      it('contains the merged value'); //todo-test
    });

    describe('child_moved', function () {
      it('triggers when Record fires a child_changed event'); //todo-test

      it('passes a NormalizedSnapshot to the callback'); //todo-test

      it('contains the merged value'); //todo-test
    });

    describe('child_removed', function () {
      it('triggers when Record fires child_removed event'); //todo-test

      it('passes a NormalizedSnapshot to the callback'); //todo-test

      it('contains the merged value'); //todo-test
    });
  });

  describe('#once', function () {
    describe('value', function() {
      it('triggers when Record fires a value event'); //todo-test

      it('passes a NormalizedSnapshot to the callback'); //todo-test

      it('returns the merged value'); //todo-test

      it('only occurs once'); //todo-test
    });

    describe('child_added', function () {
      it('triggers when Record fires a child_added event'); //todo-test

      it('passes a NormalizedSnapshot to the callback'); //todo-test

      it('returns the merged value'); //todo-test

      it('only occurs once'); //todo-test
    });

    describe('child_changed', function () {
      it('triggers when Record fires a child_changed event'); //todo-test

      it('passes a NormalizedSnapshot to the callback'); //todo-test

      it('returns the merged value'); //todo-test

      it('only occurs once'); //todo-test

    });

    describe('child_moved', function () {
      it('triggers when Record fires a child_moved event'); //todo-test

      it('passes a NormalizedSnapshot to the callback'); //todo-test

      it('returns the merged value'); //todo-test

      it('only occurs once'); //todo-test
    });

    describe('child_removed', function () {
      it('triggers when Record fires a child_removed event'); //todo-test

      it('passes a NormalizedSnapshot to the callback'); //todo-test

      it('returns the merged value'); //todo-test

      it('only occurs once'); //todo-test
    });
  });

  describe('#off', function () {
    it('removes all listeners if only event is given'); //todo-test

    it('removes first listener with callback if callback is given'); //todo-test

    it('removes first listener with callback and context if context is given'); //todo-test
  });

  describe('#orderByChild', function () {
    it('returns a Query'); //todo-test

    it('calls orderByChild on master ref'); //todo-test

    it('returns results ordered by child'); //todo-test
  });

  describe('#orderByKey', function () {
    it('returns a Query'); //todo-test

    it('calls orderByKey on master ref'); //todo-test
  });

  describe('#orderByPriority', function () {
    it('returns a Query'); //todo-test

    it('calls orderByPriority on master ref'); //todo-test

    it('returns results ordered by priority'); //todo-test
  });

  describe('#limitToFirst', function () {
    it('returns a Query'); //todo-test

    it('calls limitToFirst on master ref'); //todo-test

    it('returns the first n results'); //todo-test
  });

  describe('#limitToLast', function () {
    it('returns a Query'); //todo-test

    it('calls limitToLast on master ref'); //todo-test

    it('returns the last n results'); //todo-test
  });

  describe('#limit', function () {
    it('returns a Query'); //todo-test

    it('calls limit on the master ref'); //todo-test

    it('returns the last n results'); //todo-test
  });

  describe('#startAt', function () {
    it('returns a Query'); //todo-test

    it('calls startAt on the master ref'); //todo-test

    it('starts at the right record'); //todo-test
  });

  describe('#endAt', function () {
    it('returns a Query'); //todo-test

    it('callls endAt on the master ref'); //todo-test

    it('ends at the right record'); //todo-test
  });

  describe('#equalTo', function () {
    it('returns a Query');

    it('calls equalTo on the master ref'); //todo-test

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
