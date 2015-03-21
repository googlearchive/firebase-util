(function(angular) {

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

  angular.module('app').factory('normUtil', function($parse) {
    return {
      Field: Field,
      Path: Path,
      getKey: getKey,
      buildPaths: function buildPaths(urls, fieldNames) {
        var fields = [], paths = [];
        angular.forEach(fieldNames, function(f) {
          fields.push(new Field(f));
        });
        angular.forEach(urls, function(url) {
          paths.push(new Path(url, fields));
        });
        return paths;
      },
      updateManager: function(scope, varName) {
        return UpdateManager($parse, scope, varName);
      },
      getJoinedRef: getJoinedRef
    }
  });

  function UpdateManager($parse, scope, varName) {
    var getter = $parse(varName);
    var setter = getter.assign;

    function setVal(newVal) {
      scope.$evalAsync(function() {
        setter(scope, newVal);
      });
    }

    return {
      update: function(snap) {
        setVal(snap.val());
      },
      error: function(err) {
        console.warn(err);
        if( err instanceof Error ) {
          setVal(err.toString());
        }
        else if( angular.isObject(err) && err.code ) {
          return '[' + err.code + ']' + err.message;
        }
        else {
          return err + '';
        }
      }
    }
  }

  function getKey(path) {
    return path.alias || path.url.match(/.*\/([^\/]+)$/)[1];
  }

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

})(angular);