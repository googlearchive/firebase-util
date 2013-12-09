(function($, angular) {

   var FIREBASE_URL = 'https://fbutil-join.firebaseio.com/';

   var SAMPLE_SETS = [
      {
         name:  'Dynamic Keys',
         paths: [
            { url: 'users/account' },
            { url: 'users/profile', keyMap: {name: true, nick: true, style: 'users/styles'} }
         ],
         sort: 1
      },
      {
         name: 'Intersections and Unions',
         paths: [
            { url: 'unions/fruit', intersects: true },
            { url: 'unions/legume', intersects: true },
            { url: 'unions/veggie', intersects: true } ],
         sort: 2
      },
      {
         name: 'Sorting and Priorities',
         paths: [ { url: 'ordered/set1' }, { url: 'ordered/set2' } ],
         sort: 3
      },
      {
         name: 'Custom paths you enter',
         paths: [],
         custom: true,
         sort: 4
      }
   ];

   angular.module('app').controller('JoinDemoCtrl', function($scope, monitorRawData, monitorJoinedPaths, joinSampleConstructor) {
      $scope.joinedData = null;
      $scope.sampleCode = null;
      $scope.rawData = null;
      $scope.sampleSets = SAMPLE_SETS;
      $scope.selectedSample = $scope.sampleSets[0];
      $scope.paths = buildPaths($scope.selectedSample.paths);

      $scope.loadSample = function(evt, item) {
         evt.preventDefault();
         $scope.sampleCode = null;
         $scope.rawData = null;
         $scope.selectedSample = item;
         $scope.paths = buildPaths(item.paths);
      };
      monitorJoinedPaths($scope, 'paths', 'joinedData');
      monitorRawData($scope, 'paths', 'rawData');
      joinSampleConstructor($scope, 'paths', 'sampleCode');

      $scope.showDynamics = function(keyMap) {
         var out = '';
         angular.forEach(keyMap, function(v,k) {
            if( v !== true ) { out += '<li>dynamic key "'+k+'": '+FIREBASE_URL+v+'</li>'}
         })
      }
   });

   angular.module('app').controller('JoinDemoCtrl.user-record', function($scope) {
      $scope.hello = 'user-record';
   });

   angular.module('app').controller('JoinDemoCtrl.intersects', function($scope) {
      $scope.hello = 'intersects';
   });

   angular.module('app').controller('JoinDemoCtrl.sorted', function($scope) {
      $scope.hello = 'intersects';
   });

   angular.module('app').controller('JoinDemoCtrl.custom', function($scope) {
      $scope.hello = 'custom';
   });

   function buildPaths(pathProps) {
      var out = [];
      angular.forEach(pathProps, function(p) {
         var url = FIREBASE_URL + p.url;
         out.push(angular.extend({ intersects: false, custom: false, keyMap: null }, p, { url: url }));
      });
      return out;
   }

   angular.module('app').factory('monitorJoinedPaths', function($timeout, $parse) {
      return function($scope, pathsVar, outputVar) {
         var ref;
         $scope.$on('$destroy', cleanup);
         $scope.$watch(pathsVar, pathsUpdated, true);
         pathsUpdated();

         function pathsUpdated() {
            cleanup();
            var rawPaths = $parse(pathsVar)($scope);
            var paths = [];
            $parse(outputVar).assign($scope, null);
            if( rawPaths.length ) {
               angular.forEach(rawPaths, function(p) {
                  paths.push(pathBuilder(p));
               });
               ref = Firebase.util.join(paths);
               ref.on('value', rawDataEvent);
            }
         }

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
      }
   });

   angular.module('app').factory('monitorRawData', function($timeout, $parse) {
      return function($scope, pathsVar, outputVar) {
         var refs = [];
         var data = {};

         $scope.$on('$destroy', cleanup);
         $scope.$watchCollection(pathsVar, pathsUpdated);
         pathsUpdated();

         function pathsUpdated() {
            cleanup();
            var paths = $parse(pathsVar)($scope);
            angular.forEach(paths, processPath);
         }

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
      }
   });

   angular.module('app').factory('joinSampleConstructor', function($parse) {
      return function($scope, sourceVar, outputVar) {
         $scope.$watch(sourceVar, setConstructorSample, true);
         setConstructorSample();
         function setConstructorSample() {
            var paths = $parse(sourceVar)($scope);
            if( paths.length === 0 ) { out = '<no paths to join>'; }
            else {
               var all = allIntersects(paths);
               var m = all? 'intersection' : 'join';
               var out = 'Firebase.util.' + m + "(\n";
               var last = paths.length - 1;
               angular.forEach(paths, function(p, i) {
                  out += "  " + buildConstructorSample(p, all) + (i < last? ',' : '') + "\n";
               });
               out += ");\n"
            }
            $parse(outputVar).assign($scope, out);
         }
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
