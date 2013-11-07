module.exports = function(grunt) {

  'use strict';

  grunt.initConfig({
    jshint: {
      options: {
        undef: true,
        unused: true,
        strict: true,
        quotmark: 'single'
      },
      dev: {
        options: {
          node: true
        },
        files: {
          src: ['Gruntfile.js']
        }
      },
      client: {
        options: {
          browser: true,
          devel: true,
          globals: {
            require: true,
            define: true
          }
        },
        files: {
          src: ['public/scripts/modules/*.js', 'public/scripts/*.js']
        }
      },
      clientTests: {
        options: {
          browser: true,
          globals: {
            define: true,
            assert: true,
            suite: true,
            suiteSetup: true,
            test: true
          }
        },
        files: {
          src: ['test/client/tests/*.js']
        }
      }
    },
    requirejs: {
      compile: {
        options: {
          paths: {
            "rolodex": "empty:",
            "rolodex-presence": "empty:"
          },
          almond: false,
          mainConfigFile: "public/scripts/require-config.dist.js",
          deps: [],
//          optimize: "none",
          preserveLicenseComments: false,
          optimize: "uglify2",
          generateSourceMaps: true,
          out: "public/scripts/dist/app.js",
          exclude: [
            "config"
          ],
          name: "app",
          logLevel: 0,
          onBuildWrite: function (moduleName, path, contents) {            
            if (moduleName === "app") {
              contents = contents.replace(/^define\('app',/, "define(");
            }
            return contents;
          }
        }
      }
/*
    },
    mocha: {
      index: ['test/client/index.html']
*/
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-requirejs');
//  grunt.loadNpmTasks('grunt-mocha');

//  grunt.registerTask('test', ['mocha']);
  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('dist', ['requirejs']);

};