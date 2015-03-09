
var TABS = {
  users: {
    exampleid: 'users',
    heading: 'Users',
    title: 'Merge Profiles',
    description: "Let's implement <code>ChatFu!</code>, a messaging system for martial artists. " +
        "We need to display the names and arts for the members in room <code>The Dojo</code>. " +
        "But this data is split across three different tables. Great! Time for a NormalizedCollection.",
    active: true,
    urls: [
      'https://fbutil.firebaseio.com/examples/chatfu/users',
      'https://fbutil.firebaseio.com/examples/chatfu/nicknames'
    ],
    fields: [
      'users.name', 'users.style', 'nicknames.$value'
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
    exampleid: '',
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
      'users.name', 'users.style', 'nicknames.$value'
    ]
  }
};

angular.module('app').controller('NormalizedCollectionCtrl', function($scope, $state) {
  $scope.hello = 'world';
  $scope.tabs = copyTabs();
  $scope.go = function(tab) {
    updateActive(tab);
    $state.go('norm.example', {exampleid: tab.exampleid});
  };

  function updateActive(tab) {
    angular.forEach($scope.tabs, function(t) {
      t.active = t.exampleid === tab.exampleid;
    });
  }

  function copyTabs() {
    var tabs = [];
    angular.forEach(TABS, function(tab) {
      tabs.push(angular.extend({}, tab));
    });
    return tabs;
  }
});

angular.module('app').controller('NormalizedExampleCtrl', function($scope, $stateParams, $timeout, $window) {
  var subs = [];
  var NormalizedCollection = $window.Firebase.util.NormalizedCollection;

  var getJoinedRef = (function() {
    // inspired by: http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
    function F(refs) {
      return NormalizedCollection.apply(this, refs);
    }
    F.prototype = NormalizedCollection.prototype;

    function getRefs(urls) {
      var refs = [];
      angular.forEach(urls, function(url) {
        var ref = new $window.Firebase(typeof url === 'string'? url : url[0]);
        if( typeof url !== 'string' ) {
          ref = [ref, url[1], url[2]];
        }
        refs.push(ref);
      });
      return refs;
    }

    return function(urls, fields) {
      var nc = new F(getRefs(urls));
      nc.select.apply(nc, fields);
      return nc.ref();
    };
  })();

  function rawData(scope, varName) {
    scope[varName] = {};
    angular.forEach($scope.tab.urls, function(url) {
      var ref;
      function updated(snap) {
        $timeout(function() {
          scope[varName][snap.key()] = snap.val();
        });
      }
      ref = new $window.Firebase(typeof url === 'string'? url : url[0]);
      ref.on('value', updated);
      subs.push(function() { ref.off('value', updated); });
    });
  }

  function joinedData(scope, varName) {
    function updated(snap) {
      $timeout(function() {
        $scope[varName] = snap.val();
      });
    }
    scope[varName] = null;
    var ref = getJoinedRef($scope.tab.urls, $scope.tab.fields);
    ref.on('value', updated);
    subs.push(function() { ref.off('value', updated); });
  }

  function sampleCode(urls, fields) {
    var txt = 'new Firebase.util.NormalizedCollection(\n';
    angular.forEach(urls, function(u) {
      txt += '  ' + angular.toJson(u) + '\n';
    });
    txt += ').select(\n';
    angular.forEach(fields, function(f) {
      txt += '  ' + angular.toJson(f) + '\n';
    });
    txt += ').ref();\n';
    return txt;
  }

  $scope.tab = TABS[$stateParams.exampleid];
  $scope.sampleCode = sampleCode($scope.tab.urls, $scope.tab.fields);
  rawData($scope, 'rawData');
  joinedData($scope, 'joinedData');
});
