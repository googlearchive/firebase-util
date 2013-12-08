
var sinonChai = require('sinon-chai');
var expect = require('chai').use(sinonChai).expect;
var fbUtils = require('../firebase-utils.js');
var Firebase = require('firebase');
var helpers = require('./util/test-helpers.js');
var data = require('./util/data.join.json');

describe('join.FirebaseJoin', function() {
   before(function(done) {
      helpers.reset(data, done);
   });

   describe('#join', function() {
      it('should return a JoinedRecord', function() {
         var res = fbUtils.join(new Firebase('https://fbutil.firebaseio.com/users/account'));
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept hash objects', function() {
         var res = fbUtils.join({ref: new Firebase('https://fbutil.firebaseio.com/users/account')});
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept a JoinedRecord', function() {
         var rec = new fbUtils.JoinedRecord(new Firebase('https://fbutil.firebaseio.com/users/account'));
         var res = fbUtils.join({ref: rec});
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept a Firebase', function() {
         var res = fbUtils.join(new Firebase('https://fbutil.firebaseio.com/users/account'));
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should allow intersects: true', function() {
         var res = fbUtils.join(
            new Firebase('https://fbutil.firebaseio.com/users/account'),
            {intersects: true, ref: new Firebase('https://fbutil.firebaseio.com/users/profile')}
         );
         expect(res.paths[0].isIntersection()).to.be.false;
         expect(res.paths[1].isIntersection()).to.be.true;
      });
   });

   describe('#intersection', function() {
      it('should return a JoinedRecord', function() {
         var res = fbUtils.intersection(new Firebase('https://fbutil.firebaseio.com/users/account'));
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept hash objects', function() {
         var res = fbUtils.intersection({ref: new Firebase('https://fbutil.firebaseio.com/users/account')});
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept a JoinedRecord', function() {
         var rec = new fbUtils.JoinedRecord(new Firebase('https://fbutil.firebaseio.com/users/account'));
         var res = fbUtils.intersection({ref: rec});
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept a Firebase', function() {
         var res = fbUtils.intersection(new Firebase('https://fbutil.firebaseio.com/users/account'));
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should allow intersects: false', function() {
         var res = fbUtils.intersection(
            new Firebase('https://fbutil.firebaseio.com/users/account'),
            {intersects: false, ref: new Firebase('https://fbutil.firebaseio.com/users/profile')}
         );
         expect(res.paths[0].isIntersection()).to.be.true;
         expect(res.paths[1].isIntersection()).to.be.false;
      });
   });
});
