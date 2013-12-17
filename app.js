(function ($) {
   "use strict";

   var app = angular.module('app', ['ngRoute']);

   // later if we have more libs we'll want to switch to this layout
//   app.config(['$routeProvider',
//      function($routeProvider) {
//         $routeProvider.
//            when('/home', {
//               templateUrl: 'partials/home.html'
//            }).
//            when('/install', {
//               templateUrl: 'partials/install.html'
//            }).
//            when('/getting_started', {
//               templateUrl: 'partials/usage.html'/*,
//               controller: 'UsageCtrl'*/
//            }).
//            when('/libs', {
//               templateUrl: 'partials/libs.html'
//            }).
//            when('/support', {
//               templateUrl: 'partials/support.html'
//            }).
//            when('/demo/:lib', {
//               templateUrl: 'partials/demo.<???:lib???>.html',
//               controller: '<???:lib???>DemoCtrl'
//            }).
//            otherwise({
//               redirectTo: '/home'
//            });
//      }]);

   // make our bookmarks work in a single page for now
   app.run(function($rootScope, $location) {
      var contentLoadingPromise = getNgIncludePromise($rootScope);
      $rootScope.$on('$locationChangeStart', function(e) {
//         e.preventDefault();
         contentLoadingPromise.done(function() {
            scrollToHeader($location.path());
         });
      })
   });

//   app.directive('appBookmark', function() {
//      return {
//         restrict: 'A',
//         compile: function(el, attr) {
//            el.on('click', function(e) {
//               e.preventDefault();
//               e.stopPropagation();
//               scrollToHeader(attr.appBookmark);
//            });
//         }
//      }
//   });

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

   app.filter('pathname', function() {
      return function(url) {
         return (url||'').replace(/^[a-z]+:\/\/[^/]+\//, '');
      }
   });

   function convertPath(path) {
      var parts = (path||'/Home').substr(1).split(/[ _]/), i = parts.length;
      while(i--) {
         parts[i] = parts[i].substr(0,1).toUpperCase()+parts[i].substr(1);
      }
      return parts.join(' ');
   }

   function scrollToHeader(path) {
      var $tag = $(path? '#'+path.substr(1) : 'body');
      $tag.length && $('body,html').animate({scrollTop: Math.max($tag.offset().top-52, 0)});
      $('#navbar')
         .find('li').removeClass('active')
         .filter(':has(a[href="#'+path+'"])').addClass('active');
   }

   function getNgIncludePromise($rootScope) {
      return $.Deferred(function(def) {
         var done = 0, needs = $('[ng-include]').length;
         if( needs === 0 ) { def.resolve(); }
         else {
            var off = $rootScope.$on('$includeContentLoaded', fn);
            def.done(off);
         }
         function fn() {
            done++;
            if( done === needs ) { setTimeout(def.resolve, 500); }
         }
      });
   }

})(jQuery);