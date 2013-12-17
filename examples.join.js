(function($, angular) {

   var FIREBASE_URL = 'https://fbutil-examples.firebaseio.com/join/';

   var SAMPLE_SETS = [
      {
         name: 'Fetch the intersection of paths',
         paths: [
            { url: 'unions/fruit', intersects: true },
            { url: 'unions/legume', intersects: true },
            { url: 'unions/veggie', intersects: true }
         ]
      },
      {
         name:  'Merge denormalized user profiles',
         paths: [
            { url: 'users/account' },
            { url: 'users/profile', keyMap: {name: true, nick: true, style: 'users/styles'} }
         ]
      }
   ];

   angular.module('app').controller('JoinDemoCtrl', function($scope) {
      $scope.samples = SAMPLE_SETS;
   });

   angular.module('app').controller('JoinDemoExampleCtrl', function($scope, monitorRawData, monitorJoinedPaths, joinSampleConstructor) {
      $scope.joinedData = null;
      $scope.sampleCode = null;
      $scope.rawData = null;
      $scope.paths = buildPaths($scope.sample.paths);

      monitorJoinedPaths($scope, $scope.paths, 'joinedData');
      monitorRawData($scope, $scope.paths, 'rawData');
      joinSampleConstructor($scope, $scope.paths, 'sampleCode');
   });

   function buildPaths(pathProps) {
      var out = [];
      angular.forEach(pathProps, function(p) {
         var url = FIREBASE_URL + p.url;
         out.push(angular.extend({ intersects: false, keyMap: null }, p, { url: url, name: p.url }));
      });
      return out;
   }

   angular.module('app').factory('monitorJoinedPaths', function($timeout, $parse) {
      return function($scope, rawPaths, outputVar) {
         var ref;
         var paths = [];

         $scope.$on('$destroy', cleanup);
         $parse(outputVar).assign($scope, null);
         angular.forEach(rawPaths, function(p) {
            paths.push(pathBuilder(p));
         });
         ref = Firebase.util.join(paths);
         ref.on('value', rawDataEvent);

         function rawDataEvent(snap) {
            $timeout(function() {
               $parse(outputVar).assign($scope, snap.val());
            })
         }

         function pathBuilder(p) {
            var out = {
               ref: new Firebase(p.url),
               intersects: p.intersects
            };
            if(p.keyMap) {
               out.keyMap = buildKeyMap(p.keyMap);
            }
            return out;
         }

         function cleanup() {
            ref && ref.off('value', rawDataEvent);
         }

         return cleanup;
      }
   });

   angular.module('app').factory('monitorRawData', function($timeout, $parse) {
      return function($scope, paths, outputVar) {
         var refs = [];
         var data = {};

         $scope.$on('$destroy', cleanup);
         angular.forEach(paths, processPath);

         function processPath(p) {
            var ref = pathBuilder(p);
            ref.on('value', rawDataEvent);
            refs.push(ref);
            if(p.keyMap) {
               angular.forEach(p.keyMap, function(v) {
                  if( v !== true ) { processPath({url: FIREBASE_URL + v}); }
               })
            }
         }

         function rawDataEvent(snap) {
            data[ snap.ref().toString() ] = snap.val();
            $timeout(function() {
               $parse(outputVar).assign($scope, data);
            })
         }

         function pathBuilder(p) {
            return new Firebase(p.url);
         }

         function cleanup() {
            angular.forEach(refs, function(ref) {
               ref.off('value', rawDataEvent);
            });
            refs = [];
            data = {};
         }

         return cleanup;
      }
   });

   angular.module('app').factory('joinSampleConstructor', function($parse) {
      return function($scope, paths, outputVar) {
         var all = allIntersects(paths);
         var m = all? 'intersection' : 'join';
         var out = [];
         out.push('Firebase.util.' + m + "(");
         var last = paths.length - 1;
         angular.forEach(paths, function(p, i) {
            out.push("  " + buildConstructorSample(p, all) + (i < last? ',' : ''));
         });
         out.push(");");
         $parse(outputVar).assign($scope, out.join("\n"));
      }
   });

   function buildConstructorSample(p, allIntersects) {
      var out = 'new Firebase("'+ p.url + '")';
      if( (!p.intersects || allIntersects) && !p.keyMap ) { return out; }
      else out = "{\n    ref: "+out;
      if(p.intersects && !allIntersects) {
         out = out + ",\n    intersects: "+(p.intersects? 'true' : 'false');
      }
      if(p.keyMap) {
         out = out + ",\n    keyMap: {";
         var i = 0;
         angular.forEach(p.keyMap, function(v,k) {
            if( i++ > 0 ) { out += ', '; }
            out += k+': '+(v === true? "'"+k+"'" : "new Firebase('"+v+"')");
         });
         out = out + '}';
      }
      return out + "\n  }";
   }

   function buildKeyMap(km) {
      var out = {};
      angular.forEach(km, function(v,k) {
         out[k] = v===true? k : new Firebase(FIREBASE_URL + v);
      });
      return out;
   }

   function allIntersects(paths) {
      var res = true;
      angular.forEach(paths, function(p) {
         if( !p.intersects ) { res = false; return true; }
         return false;
      });
      return res;
   }

})(jQuery, angular);
