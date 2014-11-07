'use strict';

var gulp       = require('gulp');
var plugins    = require('gulp-load-plugins')();
var browserify = require('browserify');
var source     = require('vinyl-source-stream');
var buffer     = require('vinyl-buffer');
var karma      = require('karma-as-promised').server;
var fs         = require('fs');
var argv       = require('yargs').argv;
var gutil      = require('gulp-util');
var path       = require('path');
var seq        = require('run-sequence');

function getBundle(debug, args) {
  return browserify({debug: debug||false}, args)
    .external('firebase', {expose: 'firebase'})
    .require('./src/fbutil.js', {expose: 'firebase-util'})
    .add('./src/expose.js');
}

function copyTemplate(ext, isSpec) {
  if( !argv.t || !argv.d || !argv.n ) {
    throw new Error('Usage: gulp scaffold -t type -d directory -n name');
  }

  var baseDir = isSpec? 'test' : 'src';
  var subDir = argv.d;
  if( !isSpec ) { subDir = path.join(subDir, 'libs'); }
  var dest = path.join(baseDir, subDir, argv.n + ext);
  var src = path.join('gulp', argv.t + (isSpec? '.spec' : '') + '.tpl');
  var renameProps = {
    dirname: subDir,
    basename: argv.n,
    extname: ext
  };

  if( fs.existsSync(dest) ) {
    throw new Error('File exists: '+dest);
  }
  gutil.log('Creating ', gutil.colors.magenta(dest));
  return gulp.src(src)
    .pipe(plugins.template({ name: argv.n }))
    .pipe(plugins.rename(renameProps))
    .pipe(gulp.dest(baseDir));
}

gulp.task('build', function(){
  return getBundle()
    .bundle()
    .pipe(source('./firebase-util.js'))
    .pipe(buffer())
    .pipe(plugins.header(fs.readFileSync('./gulp/header.tpl'), {
      pkg: require('./package.json')
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
  return karma.start({
    configFile: __dirname + '/karma.conf.js'
  });
});

gulp.task('test', function () {
  return karma.start({
    configFile: __dirname+'/karma.conf.js',
    singleRun: true
  });
});

//todo include the debug maps as external files
gulp.task('minify', function() {
  getBundle()
    .bundle()
    .pipe(source('./firebase-util.min.js'))
    .pipe(buffer())
    .pipe(plugins.uglify())
    .pipe(plugins.size())
    .pipe(gulp.dest('dist'));
});

gulp.task('lint', function () {
  return gulp.src(['./gulpfile.js', './src/**/*.js', './test/**/*.spec.js'])
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(plugins.jshint.reporter('fail'));
});


gulp.task('scaffold-file', function() {
  return copyTemplate('.js');
});

gulp.task('scaffold-test', function() {
  return copyTemplate('.spec.js', true);
});

gulp.task('e2e', function() {
  //todo
});

gulp.task('scaffold', ['scaffold-file', 'scaffold-test']);

gulp.task('bundle', function() {
  return seq('lint', 'build', 'minify');
});

gulp.task('default', function() {
  return seq('test', 'bundle', 'e2e');
});
