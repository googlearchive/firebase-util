'use strict';

var FieldMap           = require('./FieldMap');
var RecordField        = require('./RecordField');
var AbstractRecord     = require('./AbstractRecord');
var util               = require('../../common');

function Record(fieldMap) {
  var name = fieldMap.getPathManager().first().id();
  var url = util.mergeToString(fieldMap.getPathManager().getUrls());
  this._super(fieldMap, name, url);
  this._eventManagers = {};
  util.log.debug('Record created', this.getName(), this.getUrl());
}

util.inherits(Record, AbstractRecord, {
  makeChild: function(key) {
    var fm = FieldMap.fieldMap(this.getFieldMap(), key);
    return new RecordField(fm);
  },

  hasChild: function(snaps, key) {
    var field = this.getFieldMap().getField(key);
    if( !field ) { return false; }
    var snap = this.getFieldMap().snapFor(snaps, key);
    return snap !== null && snap.hasChild(key);
  },

  getChildSnaps: function(snaps, fieldName) {
    var child;
    var snap = this.getFieldMap().snapFor(snaps, fieldName);
    var field = this.getFieldMap().getField(fieldName);
    if( !field ) {
      child = snap.child(fieldName);
    }
    else {
      switch(field.id) {
        case '$key':
          throw new Error('Cannot get child snapshot from key (not a real child element)');
        case '$value':
          child = snap;
          break;
        default:
          child = snap.child(field.id);
      }
    }
    return [child];
  },

  /**
   * Given a list of snapshots to iterate, returns the valid keys
   * which exist in both the snapshots and the field map, in the
   * order they should be iterated.
   *
   * Calls iterator with a {string|number} key for the next field to
   * iterate only.
   *
   * If iterator returns true, this method should abort and return true,
   * otherwise it should return false (same as Snapshot.forEach).
   *
   * @param {Array} snaps
   * @param {function} iterator
   * @param {object} [context]
   * @return {boolean} true if aborted
   * @abstract
   */
  forEachKey: function(snaps, iterator, context) {
    function shouldIterate(snap, fieldId) {
      switch(fieldId) {
        case '$key':
          return true;
        case '$value':
          return snap && snap.val() !== null;
        default:
          return snap && snap.hasChild(fieldId);
      }
    }
    var map = this.getFieldMap();
    return map.forEach(function(field) {
      var snap = map.snapFor(snaps, field.alias);
      if( shouldIterate(snap, field.id) ) {
        return iterator.call(context, field.id, field.alias) === true;
      }
      return false;
    });
  },

  /**
   * Merge the data by iterating the snapshots in reverse order
   * so that keys from later paths do not overwrite keys from earlier paths
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(snaps, isExport) {
    var map = this.getFieldMap();
    var data = util.extend.apply(null, util.map(snaps, function(ss) {
      return map.extractData(ss, isExport);
    }));
    if( isExport && snaps.length > 0 && snaps[0].getPriority() !== null ) {
      if( !util.isObject(data) ) {
        data = {'.value': data};
      }
      data['.priority'] = snaps[0].getPriority();
    }
    return data;
  },

  getPriority: function(snaps) {
    return snaps[0].getPriority();
  },

  getClass: function() { return Record; },

  saveData: function(data, props) {
    var q = util.queue();
    var map = this.getFieldMap();
    var paths = this.getPathManager().getPaths();
    if( props.isUpdate && !util.isObject(data) ) {
      throw new Error('First argument to update() command must be an object');
    }
    if( data === null ) {
      util.each(paths, function(p) {
        if( !p.hasDependency() ) {
          p.reff().remove(q.getHandler());
        }
      });
    }
    else if(util.isObject(data)) {
      var denestedData = map.denest(data);
      util.each(denestedData, function(parts) {
        var path = parts.path;
        var dataForPath = parts.data;
        var ref = this._writeRef(denestedData, path);
        if( ref !== null ) {
          if( !util.isEmpty(dataForPath) || !props.isUpdate ) {
            if( !util.isObject(dataForPath) ) {
              dataForPath = {'.value': dataForPath};
            }
            if( !props.isUpdate ) {
              addEmptyFields(map, path, dataForPath);
            }
            if( util.isDefined(props.priority) ) {
              dataForPath['.priority'] = props.priority;
            }
            if( util.has(dataForPath, '.value') ) {
              ref.set(dataForPath, q.getHandler());
            }
            else {
              ref.update(dataForPath, q.getHandler());
            }
          }
        }
        else {
          util.log.info('No dynamic key found for master', paths[0].ref().toString(), 'with dynamic path', path.ref().toString());
        }
      }, this);
    }
    else if( paths.length === 1 ) {
      if( util.isDefined(props.priority) ) {
        paths[0].ref().setWithPriority(data, props.priority, q.getHandler());
      }
      else {
        paths[0].ref().set(data, q.getHandler());
      }
    }
    else {
      throw new Error('Cannot set multiple paths to a non-object value. ' +
        'Since this is a NormalizedCollection, the data will be split between the paths. ' +
        'But I can\'t split a primitive value');
    }
    q.handler(props.callback||util.noop, props.context);
  },

  getName: function() {
    return this._name;
  },

  getUrl: function() {
    return this._url;
  },

  _start: function(event) {
    if( !util.has(this._eventManagers, event) ) {
      util.log.debug('Record._start: event=%s, url=%s', event, this.getUrl());
      this._eventManagers[event] = event === 'value'?
        new ValueEventManager(this) : new ChildEventManager(event, this);
    }
    this._eventManagers[event].start();
  },

  _stop:   function(event) {
    if (util.has(this._eventManagers, event)) {
      util.log.debug('Record._stop: event=%s, url=%s', event, this.getUrl());
      this._eventManagers[event].stop();
    }
  },

  _writeRef: function(denestedData, path) {
    var ref = path.reff();
    var dep = path.getDependency();
    if( dep !== null ) {
      var depPath = this.getPathManager().getPath(dep.path);
      var key = this._depKey(denestedData, depPath, dep.field);
      ref = key === null? null : ref.child(key);
    }
    return ref;
  },

  _depKey: function(denestedData, path, fieldId) {
    var key;
    var dat = denestedData[path.name()].data;
    switch(fieldId) {
      case '$key':
        key = path.id();
        break;
      case '$value':
        key = util.has(dat, '.value')? dat['.value'] : util.isEmpty(dat)? null : dat;
        break;
      default:
        key = util.has(dat, fieldId)? dat[fieldId] : null;
    }
    var type = typeof key;
    if( key !== null && type !== 'string' ) {
      throw new Error(
          'Dynamic key values must be a string. Type was ' +
          type + ' for ' + path.ref().toString() + '->' + fieldId
      );
    }
    return key;
  }
});

function ValueEventManager(rec) {
  this.rec = rec;
  this.pm = rec.getPathManager();
  this.running = false;
  this._init();
}

ValueEventManager.prototype = {
  start: function() {
    if( !this.running ) {
      this.running = true;
      util.each(this.pm.getPathNames(), this._startPath, this);
    }
  },

  stop: function() {
    if( this.running ) {
      this.running = false;
      util.each(this.subs, function(fn) {
        fn();
      });
      this._init();
    }
  },

  update: function(pathName, snap) {
    this.snaps[pathName] = snap;
    this._checkLoadState();
    util.log('Record.ValueEventManager.update: url=%s, loadCompleted=%s', snap.ref().toString(), this.loadCompleted);
    if( this.loadCompleted ) {
      this.rec.handler('value')(util.toArray(this.snaps));
    }
  },

  _startPath: function(pathName) {
    var self = this;
    var path = self.pm.getPath(pathName);
    var fn = util.bind(self.update, self, pathName);
    if( path.hasDependency() ) {
      var dyno = new Dyno(path, this.rec.getFieldMap(), 'value', fn);
      this.subs.push(dyno.dispose);
    }
    else {
      path.ref().on('value', fn);
      self.subs.push(function() {
        path.ref().off('value', fn);
      });
    }
  },

  _checkLoadState: function() {
    if( this.loadCompleted ) { return; }
    var snaps = this.snaps;
    var pathNames = this.pm.getPathNames();
    this.loadCompleted = !util.contains(pathNames, function(p) {
      return !snaps.hasOwnProperty(p);
    });
  },

  _init: function() {
    this.loadCompleted = false;
    this.snaps = {};
    this.subs = [];
  }
};

function ChildEventManager(event, rec) {
  this.event = event;
  this.rec = rec;
  this.map = rec.getFieldMap();
  this.pm = rec.getPathManager();
  this.subs = [];
  this.dyno = null;
}

ChildEventManager.prototype = {
  start: function() {
    util.each(this.pm.getPathNames(), function(pathName) {
      var event = this.event;
      var path = this.pm.getPath(pathName);
      var fn = util.bind(this.update, this);
      if( path.hasDependency() ) {
        this.dyno = new Dyno(path, this.map, event, fn);
        this.subs.push(this.dyno.dispose);
      }
      else {
        path.ref().on(event, fn);
        this.subs.push(function() {
          path.ref().off(event, fn);
        });
      }
    }, this);
  },

  stop: function() {
    util.each(this.subs, function(fn) {
      fn();
    });
    this.subs = [];
  },

  update: function(snap, prev) {
    if( snap !== null ) {
      var args = [snap.key(), snap];
      if( prev !== util.undef ) { args.push(prev); }
      util.log('Record.ChildEventManager.update: event=%s, key=%s/%s', this.event, snap.ref().parent().key(), snap.key());
      this.rec.handler(this.event).apply(this.rec, args);
    }
  }
};

/**
 * Process a path which depends on the value of another field. We have
 * to monitor the field it depends on for value events and update
 * the ref that we listen on whenever the id is modified.
 *
 * @param {Path} path
 * @param {FieldMap } fieldMap
 * @param {string} event
 * @param {function} updateFn
 * @constructor
 */
function Dyno(path, fieldMap, event, updateFn) {
  var dep = path.getDependency();
  var depPath = fieldMap.getPath(dep.path);
  var depRef = depPath.ref();
  if( dep.field === '$key' ) {
    throw new Error('Dynamic paths do not support $key (you should probably just join on this path)');
  }
  if( dep.field !== '$value' ) {
    depRef = depRef.child(dep.field);
  }
  var ref;

  // establish our listener at the field which contains the id of our ref
  var depFn = depRef.on('value', function(snap) {
    if( ref && ref.key() !== snap.val() ) {
      util.log.debug('Record.Dyno: stopped monitoring %s', ref.toString());
      // any time the id changes, remove the old listener
      ref.off(event, updateFn);
      updateFn(null);
    }
    if( snap.val() !== null ) {
      // establish our listener at the correct dynamic id for values
      ref = path.ref().child(snap.val());
      ref.on(event, updateFn);
      util.log('Record.Dyno: monitoring %s', ref.toString()); //debug
    }
  });

  // create a dispose method that can turn off all our event listeners
  // when _stop is called
  this.dispose = function() {
    depRef.off('value', depFn);
    if( ref ) {
      ref.off(event, updateFn);
    }
  };
}

function addEmptyFields(map, path, dataToSave) {
  util.each(map.fieldsFor(path.name()), function(f) {
    switch(f.id) {
      case '$key':
        // ignore key
        break;
      case '$value':
        if( !util.has(dataToSave, '.value') ) {
          dataToSave['.value'] = null;
        }
        break;
      default:
        if( !util.has(dataToSave, f.id) ) {
          dataToSave[f.id] = null;
        }
    }
  });
}

module.exports = Record;