(function (angular) {
  "use strict";

  var app = angular.module('app');

  app.controller('PageCtrl', function($scope, $stateParams, pageTabs, exampleTabsManager, $pageArray, $scrollArray, gistLoader) {
    var exampleId = $stateParams.exampleid || 'scroll';
    $scope.tabs = pageTabs(exampleId);
    $scope.tab = $scope.tabs.find(function(tab) { return tab.exampleid === exampleId; });
    $scope.go = exampleTabsManager('page', exampleId);

    var ref = new Firebase('https://fbutil.firebaseio.com/paginate');
    console.log('exampleId', exampleId); //debug
    if( exampleId === 'scroll' ) {
      $scope.scrollItems = $scrollArray(ref, 'number');
    }
    else if( exampleId === 'page') {
      console.log('loading page'); //debug
      $scope.pageItems = $pageArray(ref, 'number');
    }

    if( $scope.tab.gistid ) {
      $scope.content = gistLoader();
      $scope.content.add($scope.tab.exampleid, $scope.tab.gistid);
    }
  });

  app.factory('$pageArray', function($firebaseArray) {
    return function(ref, field) {
      var pageRef = new Firebase.util.Paginate(ref, field, {maxCacheSize: 250});
      var list = $firebaseArray(pageRef);
      list.page = pageRef.page;

      pageRef.page.onPageCount(function(currentPageCount, couldHaveMore) {
        list.pageCount = currentPageCount;
        list.couldHaveMore = couldHaveMore;
      });

      pageRef.page.onPageChange(function(currentPageNumber) {
        list.currentPageNumber = currentPageNumber;
      });

      pageRef.page.next();

      return list;
    }
  });

  app.factory('$scrollArray', function($firebaseArray) {
    return function(ref, field) {
      var scrollRef = new Firebase.util.Scroll(ref, field);
      var list = $firebaseArray(scrollRef);
      list.scroll = scrollRef.scroll;
      return list;
    }
  });

  app.factory('gistLoader', function($http) {
    return function() {
      var out = { data: {} };
      out.add = function(name, gistid) {
        var gist = out.data[name] = {};
        var gistUrl = 'https://api.github.com/gists/' + gistid;
        $http.get(gistUrl)
          .success(function (data, status) {
            angular.forEach(data.files, function(file, name) {
              gist[name] = file.content;
            });
          })
          .error(function (data, status) {
            var error = '[' + status + ']' + (data + '(gistid='+gistid+')' || 'Request failed for gist ' + gistid);
            console.error(error); //debug
            gist['ERROR'] = error;
          });
        return gist;
      };
      return out;
    }
  });
})(angular);

(function(angular) {
  var TABS = {
    scroll: {
      exampleid: 'scroll',
      title: 'Infinite Scroll',
      demo: 'demo/Paginate/demo.scroll.html',
      gistid: '0e14f81e2a10f75e3fcb',
      dataurl: 'https://fbutil.firebaseio.com/paginate'
    },
    page: {
      exampleid: 'page',
      title: 'Paginate',
      demo: 'demo/Paginate/demo.page.html',
      gistid: '54fa9a1e713b61672f53',
      dataurl: 'https://fbutil.firebaseio.com/paginate'
    },
    ngInfiniteScroll: {
      exampleid: 'ngInfiniteScroll',
      title: 'ngInfiniteScroll',
      gistid: 'dd354f1f236e3086f61f',
      dataurl: 'https://fbutil.firebaseio.com/paginate'
    },
    uiGrid: {
      exampleid: 'uiGrid',
      title: 'ui-grid',
      gistid: 'c74b6e2d047c9e2eaaa9',
      dataurl: 'https://fbutil.firebaseio.com/paginate'
    },
    ionic: {
      exampleid: 'ionic',
      title: 'Ionic',
      gistid: '7adb5775dce44cbbba0a',
      dataurl: 'https://webapi.firebaseio.com/rolodex.json?print=pretty'
    }
  };

  function copyTabs(selected) {
    var tabs = [];
    angular.forEach(TABS, function(tab) {
      tabs.push(angular.extend({}, tab, {active: selected === tab.exampleid}));
    });
    if( !tabs.find ) {
      tabs.find = function(callback, context) {
        for(var i= 0, len = tabs.length; i < len; i++) {
          if( callback.call(context, tabs[i], i, tabs) === true ) {
            return tabs[i];
          }
        }
      };
    }
    return tabs;
  }

  angular.module('app').service('pageTabs', function() {
    return copyTabs;
  });
})(angular);
