(function() {

  function sampleCode(paths) {
    var fieldText = '';
    var txt = 'new Firebase.util.NormalizedCollection(\n';
    angular.forEach(paths, function(path) {
      txt += '  ' + path.toString() + '\n';
      angular.forEach(path.fields, function(f) {
        if(f.exists()) {
          fieldText += '  ' + f.toString() + '\n';
        }
      });
    });
    txt += ').select(\n';
    txt += fieldText;
    txt += ').ref();\n';
    return txt;
  }

  function findTab(tabs, id) {
    for(var i= 0, len = tabs.length; i < len; i++) {
      if( tabs[i].exampleid === id ) {
        return tabs[i];
      }
    }
    throw new Error('Tab ' + id + ' not found');
  }

  function destroyListeners(subs) {
    angular.forEach(subs, function(fn) {
      fn();
    });
  }


  angular.module('app').controller('NormalizedExampleCtrl', function($scope, normUtil, normTabs, $stateParams, $state) {
    var subs = [];

    function rawData(scope, varName, paths) {
      angular.forEach(paths, function(path) {
        var ref = path.getRef();
        var mgr = normUtil.updateManager(scope, varName + '.' + ref.key());
        ref.on('value', mgr.update, mgr.error);
        subs.push(function() { ref.off('value', mgr.update); });
      });
    }

    function joinedData(scope, varName, paths) {
      var mgr = normUtil.updateManager(scope, varName);
      var ref = normUtil.getJoinedRef(paths);
      ref.on('value', mgr.update, mgr.error);
      subs.push(function() { ref.off('value', mgr.update); });
    }

    $scope.go = function(tab) {
      // this check is necessary because ui-bootstrap's tabs directive will trigger
      // the select listener on initial load, which conflicts with routing here and causes
      // redundant calls to $scope.go()
      if( tab.exampleid !== $stateParams.exampleid ) {
        $state.go('norm.example', {exampleid: tab.exampleid});
      }
    };

    $scope.run = function() {
      try {
        destroyListeners(subs);
        $scope.ready = true;
        $scope.output.code = sampleCode($scope.paths);
        if ($scope.exampleid !== 'custom') {
          rawData($scope, 'output.raw', $scope.paths);
        }
        joinedData($scope, 'output.joined', $scope.paths);
      }
      catch(e) {
        $scope.output.code = e;
      }
    };

    $scope.addPath = function() {
      $scope.paths.push(new normUtil.Path())
    };

    $scope.removePath = function(e, i) {
      e.preventDefault();
      $scope.paths.splice(i, 1);
    };

    $scope.addField = function(path) {
      path.fields.push(new normUtil.Field(normUtil.getKey(path)+'.'));
    };

    $scope.removeField = function(e, i, path) {
      e.preventDefault();
      path.fields.splice(i, 1);
    };

    $scope.output = {};
    $scope.exampleid = $stateParams.exampleid||'users';
    $scope.tabs = normTabs($scope.exampleid);
    $scope.tab = findTab($scope.tabs, $scope.exampleid);
    $scope.paths = normUtil.buildPaths($scope.tab.urls, $scope.tab.fields);
    if( $scope.exampleid !== 'custom' ) {
      $scope.run();
    }
  });

})();