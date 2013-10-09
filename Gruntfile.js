/* global module */

module.exports = function(grunt) {
   'use strict';

   grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),
      banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
         '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
         '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
         '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>\n' +
         '* MIT LICENSE */\n\n(function(exports) {\n   "use strict";\n\n',
      footer: '\n\n   exports.FirebaseJoin = FirebaseJoin;\n\n})( typeof(exports) === "undefined" || !exports? window : exports );\n',

      concat: {
         app: {
            options: { banner: '<%= banner %>', footer: '<%= footer %>' },
            src: [
               'src/FirebaseJoin.js',
               'src/Snapshot.js',
               'src/MergedChild.js',
               'src/static_methods.js'
            ],
            dest: 'fbjoin.js'
         }
      },

      uglify: {
         app: {
            files: {
               'fbjoin.min.js': ['fbjoin.js']
            }
         }
      },

      watch: {
         scripts: {
            files: ['src/*.js', 'Gruntfile.js'],
            tasks: ['make', 'test'],
            options: {
               interrupt: true
            }
         },
         tests: {
            files: ['test/**'],
            tasks: ['test']
         }
      },

      // Configure a mochaTest task
      mochaTest: {
         test: {
            options: {
               reporter: 'spec',
               growl: true,
               require: [
                  './fbjoin.js'
               ]
            },
            src: ['test/**/*.js']
         }
      }

   });

   grunt.loadNpmTasks('grunt-contrib-uglify');
   grunt.loadNpmTasks('grunt-contrib-concat');
   grunt.loadNpmTasks('grunt-exec');
   grunt.loadNpmTasks('grunt-contrib-watch');
   grunt.loadNpmTasks('grunt-notify');
   grunt.loadNpmTasks('grunt-mocha-test');

   grunt.registerTask('make', ['concat', 'uglify']);
   grunt.registerTask('test', ['mochaTest']);

   grunt.registerTask('default', ['make', 'watch']);
};
