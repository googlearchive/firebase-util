(function(angular) {
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
        ['https://fbutil.firebaseio.com/examples/chatfu/messages/TheDojo', 'message'],
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

  angular.module('app').service('normTabs', function() {
    return copyTabs;
  });
})(angular);