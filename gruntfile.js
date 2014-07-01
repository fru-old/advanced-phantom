'use strict';
 
module.exports = function (grunt) {
	// load all grunt tasks
	grunt.loadNpmTasks('grunt-testing-nodeunit');
	grunt.loadNpmTasks('grunt-docco');
	grunt.loadNpmTasks('grunt-jscs');
	
	grunt.initConfig({
		'testing-nodeunit': {
			all: ['test/test*.js']
		},
		docco: {
			docs: {
				src: ['src/**/*.js'],
				options: {
					output: 'report/source/'
				}
			}
		},
		jscs: {
    		src: "src/index.js",
    		options: {
        		config: "codestyle.json",
        		//reporter: 'text',
        		//reporterOutput: 'report/jscs.html'
    		}
		}
	});

	grunt.registerTask('default', ['docco', 'jscs']);
	grunt.registerTask('test', ['testing-nodeunit']);
};