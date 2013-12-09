(function ($) {
   "use strict";

   var app = angular.module('app', ['ngRoute','firebase']);

   app.config(['$routeProvider',
      function($routeProvider) {
         $routeProvider.
            when('/home', {
               templateUrl: 'partials/home.html'
            }).
            when('/install', {
               templateUrl: 'partials/install.html'
            }).
            when('/getting_started', {
               templateUrl: 'partials/usage.html'/*,
               controller: 'UsageCtrl'*/
            }).
            when('/libs', {
               templateUrl: 'partials/libs.html'
            }).
            when('/support', {
               templateUrl: 'partials/support.html'
            }).
            when('/demo/join', {
               templateUrl: 'partials/demo.join.html',
               controller: 'JoinDemoCtrl' // demo.join.js
            }).
            otherwise({
               redirectTo: '/home'
            });
      }]);

   app.controller('NavCtrl', function($scope, $location) {
      $scope.subtitle = 'Home';
      $scope.$on('$routeChangeSuccess', function() {
         $scope.subtitle = convertPath($location.path());
      })
   });

   app.directive('prettyprint', function() {
      return {
         restrict: 'C',
         compile: function(el, attr) {
            if( attr.ngPrettify ) {
               var html = $('script[type="text/template"][name="'+attr.ngPrettify+'"]').html();
               el.text(html);
            }
            prettyPrint();
         },
         link: function() {
            prettyPrint();
         }
      }
   });

   function convertPath(path) {
      var parts = (path||'/Home').substr(1).split(/[ _]/), i = parts.length;
      while(i--) {
         parts[i] = parts[i].substr(0,1).toUpperCase()+parts[i].substr(1);
      }
      return parts.join(' ');
   }

})(jQuery);