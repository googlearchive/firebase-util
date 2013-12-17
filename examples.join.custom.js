(function($, angular) {

   angular.module('app').controller('JoinCustomCtrl', function($scope, monitorRawData, monitorJoinedPaths, joinSampleConstructor) {
      $scope.joinedData = null;
      $scope.sampleCode = null;
      $scope.rawData = null;
      $scope.paths = [
         {url: 'https://fbutil-examples.firebaseio.com/join/numbers/english', intersects: false},
         {url: 'https://fbutil-examples.firebaseio.com/join/numbers/spanish', intersects: false },
         {url: 'https://fbutil-examples.firebaseio.com/join/numbers/french', intersects: false }
      ];

      var subs = [];
      $scope.$watch('paths', pathChange, true);
      pathChange();

      $scope.remove = function(evt, $index) {
         evt.preventDefault();
         $scope.paths.splice($index, 1);
      };

      $scope.add = function(evt) {
         evt.preventDefault();
         $scope.paths.push({url: null, intersects: false});
      };

      function pathChange() {
         cleanup();
         var preppedPaths = buildPaths($scope.paths);
         subs.push(monitorJoinedPaths($scope, preppedPaths, 'joinedData'));
         subs.push(monitorRawData($scope, preppedPaths, 'rawData'));
         joinSampleConstructor($scope, preppedPaths, 'sampleCode', true);
      }

      function cleanup() {
         angular.forEach(subs, function(s) { s(); });
      }
   });

   function buildPaths(pathProps) {
      var out = [];
      angular.forEach(pathProps, function(p) {
         if(p.url) {
            out.push(angular.extend({ intersects: false, keyMap: null }, p, { name: p.url }));
         }
      });
      return out;
   }

})(jQuery, angular);
