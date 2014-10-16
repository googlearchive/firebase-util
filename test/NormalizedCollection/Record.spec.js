'use strict';

describe('Record', function() {

  describe('#child', function() {
    it('should return a RecordField');

    it('should pick the correct path to descend from');

    it('should have exactly one field');

    it('should use the primary/first path if none matches the field name');
  });

  describe('#getChildSnaps', function() {
    it('should return one snapshot');

    it('should be the snapshot for the correct child key');
  });

  describe('#mergeData', function() {
    it('should contain intersection of all snaps and fields');

    it('should include $value');

    it('should include $key');
  });

  describe('watch', function() {
    it('should trigger callbacks with a Snapshot object');

    it('should include a snapshot for each non-null path');
  });

  describe('#_start', function() {
    it('should invoke on() for all refs/paths');
  });

  describe('#_stop', function() {
    it('should invoke off() for all refs/paths');
  });
});