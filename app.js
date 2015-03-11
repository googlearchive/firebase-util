(function ($) {
   "use strict";

   //Firebase.util.logLevel('debug');

   var app = angular.module('app', ['ui.router', 'ui.bootstrap', 'ngSanitize', 'firebase']);

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
           .state('norm.example', {
             url: '/example/:exampleid',
             data: {sectionid: 'examples'},
             views: {
               examples: {
                 templateUrl: 'demo/NormalizedCollection/example.template.html',
                 controller: 'NormalizedExampleCtrl'
               }
             }
           });

         $urlRouterProvider
           .otherwise('/');
      }]);

   // make our bookmarks work in a single page for now
   app.run(function($rootScope, $location) {
      $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
         scrollToHeader((toParams && toParams.sectionid)||(toState.data && toState.data.sectionid));
      });
      $rootScope.$on('$locationChangeError', function() {
         console.error(arguments);
      });
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

   app.filter('pathname', function() {
      return function(url) {
         return (url||'').replace(/^[a-z]+:\/\/[^/]+\//, '');
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