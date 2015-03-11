(function() {
  function Field(fieldString) {
    var parts = fieldString.split('.');
    var m = parts.length > 1? parts[1].match(/^([^ ]+) as (.*)$/) : null;
    this.pathName = parts[0];
    if( m ) {
      this.key = m[1];
      this.alias = m[2];
    }
    else {
      this.key = parts[1]||null;
      this.alias = null;
    }
  }
  Field.prototype.toString = function() {
    return angular.toJson(this.toProps());
  };
  Field.prototype.toProps = function() {
    var key = this.pathName + '.' + this.key;
    if( this.alias ) {
      return {key: key, alias: this.alias};
    }
    else {
      return key;
    }
  };
  Field.prototype.exists = function() {
    return !!this.key;
  };

  function Path(url, fieldList) {
    this.alias = null;
    this.dep = null;
    this.fields = [];
    if( angular.isArray(url) ) {
      this.url = url[0];
      this.alias = url[1]||null;
      this.dep = url[2]||null;
    }
    else {
      this.url = url||null;
    }
    if( fieldList ) {
      var key = getKey(this);
      var fields = this.fields;
      angular.forEach(fieldList, function(field) {
        if( field.pathName === key ) {
          fields.push(field);
        }
      });
    }
  }
  Path.prototype.update = function() {
    var key = getKey(this);
    angular.forEach(this.fields, function(f) {
      f.pathName = key;
    });
  };
  Path.prototype.toArray = function() {
    return [this.url, this.alias, this.dep];
  };
  Path.prototype.toString = function() {
    var parts;
    if( this.dep || this.alias ) {
      parts = [this.url, this.alias];
      if( this.dep ) { parts.push(this.dep); }
    }
    else {
      parts = this.url;
    }
    return angular.toJson(parts);
  };
  Path.prototype.toProps = function() {
    var ref = this.getRef();
    if( this.alias || this.dep ) {
      return [ref, this.alias, this.dep];
    }
    else {
      return ref;
    }
  };
  Path.prototype.getRef = function() {
    return new Firebase(this.url);
  };

  var TABS = {
    users: {
      exampleid: 'users',
      heading: 'Users',
      title: 'Merge Profiles',
      description: "Let's implement <code>ChatFu!</code>, a messaging system for martial artists. " +
      "We need to display the names and arts for the members in room <code>The Dojo</code>. " +
      "But this data is split across three different tables. Great! Time for a NormalizedCollection.",
      active: false,
      urls: [
        'https://fbutil.firebaseio.com/examples/chatfu/users',
        'https://fbutil.firebaseio.com/examples/chatfu/nicknames'
      ],
      fields: [
        'users.name', 'users.style', 'nicknames.$value as nick'
      ]
    },
    messages: {
      exampleid: 'messages',
      heading: 'Messages',
      title: 'Merge Messages With Names',
      description: "Let's get messages for users in the room <code>The Dojo</code>, for our " +
      "new messaging app, <code>ChatFu!</code>. We need to join the users table with " +
      "messages, but they are stored in different paths. Great! Time for another NormalizedCollection.",
      active: false,
      urls: [
        ['https://fbutil.firebaseio.com/examples/chatfu/messages/The Dojo', 'message'],
        ['https://fbutil.firebaseio.com/examples/chatfu/users', 'users', 'message.user']
      ],
      fields: [
        'message.user', 'message.text', 'users.name', 'users.style'
      ]
    },
    custom: {
      exampleid: 'custom',
      heading: 'Create Your Own',
      title: 'Build Your Own!',
      description: "Change out any of the URLs with paths to be joined, and specify the fields. " +
      "This demo will give you the code and the results.",
      active: false,
      urls: [
        'https://fbutil.firebaseio.com/examples/chatfu/users',
        'https://fbutil.firebaseio.com/examples/chatfu/nicknames'
      ],
      fields: [
        'users.name', 'users.style', 'nicknames.$value as nick'
      ]
    }
  };

  function copyTabs(selected) {
    var tabs = [];
    angular.forEach(TABS, function(tab) {
      tabs.push(angular.extend({}, tab, {active: selected === tab.exampleid, fields: tab.fields.slice(), urls: tab.urls.slice()}));
    });
    return tabs;
  }

  var getJoinedRef = (function() {
    // inspired by: http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
    function F(refs) {
      return Firebase.util.NormalizedCollection.apply(this, refs);
    }
    F.prototype = Firebase.util.NormalizedCollection.prototype;

    function getRefs(paths) {
      var refs = [];
      angular.forEach(paths, function(path) {
        refs.push(path.toProps());
      });
      return refs;
    }


    function getFields(paths) {
      var fields = [];
      angular.forEach(paths, function(path) {
        angular.forEach(path.fields, function(field) {
          if( field.exists() ) {
            fields.push(field.toProps());
          }
        });
      });
      return fields;
    }

    return function(paths) {
      var nc = new F(getRefs(paths));
      nc.select.apply(nc, getFields(paths));
      return nc.ref();
    };
  })();

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

  function getKey(path) {
    return path.alias || path.url.match(/.*\/([^\/]+)$/)[1];
  }

  function buildPaths(urls, fieldNames) {
    var fields = [], paths = [];
    angular.forEach(fieldNames, function(f) {
      fields.push(new Field(f));
    });
    angular.forEach(urls, function(url) {
      paths.push(new Path(url, fields));
    });
    return paths;
  }

  function destroyListeners(subs) {
    angular.forEach(subs, function(fn) {
      fn();
    });
  }

// The length of this controller hurts my brain; don't use this as an example of
// how to write Angular code. This is part laziness because I don't want to turn
// this into services and directives and part necessity since routing plus ui-bootstrap
// tabs plus some custom templating code makes for a lot of coupling in a quick and dirty demo app
  angular.module('app').controller('NormalizedExampleCtrl', function($scope, $stateParams, $state, $timeout, $window) {
    var subs = [];

    function rawData(scope, varName, paths) {
      scope[varName] = {};
      angular.forEach(paths, function(path) {
        var ref = path.getRef();
        function updated(snap) {
          $timeout(function() {
            scope[varName][snap.key()] = snap.val();
          });
        }
        ref.on('value', updated);
        subs.push(function() { ref.off('value', updated); });
      });
    }

    function joinedData(scope, varName, paths) {
      function updated(snap) {
        $timeout(function() {
          $scope[varName] = snap.val();
        });
      }
      scope[varName] = null;
      var ref = getJoinedRef(paths);
      ref.on('value', updated);
      subs.push(function() { ref.off('value', updated); });
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
        $scope.sampleCode = sampleCode($scope.paths);
        if ($scope.exampleid !== 'custom') {
          rawData($scope, 'rawData', $scope.paths);
        }
        joinedData($scope, 'joinedData', $scope.paths);
      }
      catch(e) {
        $scope.joinedData = e;
      }
    };

    $scope.addPath = function() {
      $scope.paths.push(new Path())
    };

    $scope.removePath = function(e, i) {
      e.preventDefault();
      $scope.paths.splice(i, 1);
    };

    $scope.addField = function(path) {
      path.fields.push(new Field(getKey(path)+'.'));
    };

    $scope.removeField = function(e, i, path) {
      e.preventDefault();
      path.fields.splice(i, 1);
    };

    $scope.exampleid = $stateParams.exampleid||'users';
    $scope.tabs = copyTabs($scope.exampleid);
    $scope.tab = findTab($scope.tabs, $scope.exampleid);
    $scope.paths = buildPaths($scope.tab.urls, $scope.tab.fields);
    if( $scope.exampleid !== 'custom' ) {
      $scope.run();
    }

  });
})();

