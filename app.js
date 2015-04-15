(function ($) {
   "use strict";

   //Firebase.util.logLevel('debug');

   var app = angular.module('app', ['ui.router', 'ui.bootstrap', 'ngSanitize', 'firebase']);

  app.constant('VERSION_FIREBASE', '2.2.3');
  app.constant('VERSION_FBUTIL', '0.2.4');

  // later if we have more libs we'll want to switch to this layout
   app.config(['$stateProvider', '$urlRouterProvider',
      function($stateProvider, $urlRouterProvider) {
         $stateProvider
           .state('home', {
              url: '/',
              templateUrl: 'partials/home.html'
           })
           .state('section', {
              url: '/section/:sectionid',
              templateUrl: 'partials/home.html'
           })
           .state('norm', {
              url: '/toolbox/NormalizedCollection',
              abstract: true,
              templateUrl: 'demo/NormalizedCollection/index.html'
           })
           .state('norm.start', {
              url: '/',
              views: {
                examples: {
                  templateUrl: 'demo/NormalizedCollection/example.template.html',
                  controller: 'NormCtrl'
                }
              }
           })
           .state('norm.example', {
             url: '/example/:exampleid',
             data: {sectionid: 'examples'},
             views: {
               examples: {
                 templateUrl: 'demo/NormalizedCollection/example.template.html',
                 controller: 'NormCtrl'
               }
             }
           })
           .state('page', {
             url: '/toolbox/Paginate',
             abstract: true,
             templateUrl: 'demo/Paginate/index.html'
           })
           .state('page.start', {
             url: '/',
             views: {
               examples: {
                 templateUrl: 'demo/Paginate/example.template.html',
                 controller: 'PageCtrl'
               }
             }
           })
           .state('page.example', {
             url: '/example/:exampleid',
             data: {sectionid: 'examples'},
             views: {
               examples: {
                 templateUrl: 'demo/Paginate/example.template.html',
                 controller: 'PageCtrl'
               }
             }
           });

         $urlRouterProvider
           .otherwise('/');
      }]);

   // make our bookmarks work in a single page for now
   app.run(function($rootScope, VERSION_FIREBASE, VERSION_FBUTIL) {
      $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        scrollToHeader((toParams && toParams.sectionid) || (toState.data && toState.data.sectionid));
      });
      $rootScope.$on('$locationChangeError', function() {
         console.error(arguments);
      });
      $rootScope.versions = {
         firebase: VERSION_FIREBASE,
         util: VERSION_FBUTIL
      };
   });

   app.directive('prettify', ['$compile', '$timeout', function ($compile, $timeout) {
      return {
         restrict: 'E',
         scope: {
            target: '='
         },
         link: function (scope, element, attrs) {
            var template = element.html();
            var templateFn = $compile(template);
            var update = function(){
               $timeout(function () {
                  var compiled = templateFn(scope).html();
                  // hacky, can't tell why the pre tags get stripped here
                  var prettified = prettyPrintOne('<pre>' + compiled + '</pre>');
                  element.html(prettified);
               }, 0);
            };
            if( attrs.target ) {
              scope.$watch('target', function () {
                 update();
              }, true);
            }
            update();
         }
      };
   }]);

   app.factory('exampleTabsManager', function($stateParams, $state) {
     return function(stateName, currentExampleId) {
       var skipFirst = !$stateParams.exampleid;
       return function(tab) {
         // this check is necessary because ui-bootstrap's tabs directive will trigger
         // the select listener on initial load, which conflicts with routing here and causes
         // redundant calls to $scope.go()
         if( skipFirst ) {
           skipFirst = false;
         }
         else if( tab.exampleid !== currentExampleId ) {
           $state.go(stateName + '.example', {exampleid: tab.exampleid});
         }
       }
     }
   });

   app.filter('pathname', function() {
      return function(url) {
         return (url||'').replace(/^[a-z]+:\/\/[^/]+\//, '');
      }
   });

  app.directive('scrollToBottom', function () {
    var unbind;
    return {
      restrict: 'A',
      scope: { scrollToBottom: "=" },
      link: function (scope, element) {
        if( unbind ) { unbind(); }
        unbind = scope.$watchCollection('scrollToBottom', function () {
          $(element).animate({scrollTop: element[0].scrollHeight});
        });
      }
    }
  });

   function scrollToHeader(path) {
      setTimeout(function() {
         var $tag = $(path? '#'+ path : 'body');
         $tag.length && $('body,html').animate({scrollTop: Math.max($tag.offset().top-52, 0)});
         $('#navbar')
            .find('li').removeClass('active')
            .filter(':has(a[href="#'+path+'"])').addClass('active');
      });
   }

})(jQuery);