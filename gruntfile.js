'use strict';
 
module.exports = function (grunt) {
    // load all grunt tasks
    grunt.loadNpmTasks('grunt-testing-nodeunit');
    
    grunt.initConfig({
	  'testing-nodeunit': {
		all: ['test/test*.js']
	  }
	});
     // the default task (running "grunt" in console) is "watch"
     grunt.registerTask('test', ['testing-nodeunit']);
};