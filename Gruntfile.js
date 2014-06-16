module.exports = function(grunt){

	var pkg = grunt.file.readJSON('package.json');

	grunt.initConfig({
		release: {
			options: {}
		}
	});

	var taskName;
	for(taskName in pkg.devDependencies) {
		if(taskName.substring(0, 6) == 'grunt-') {
			grunt.loadNpmTasks(taskName);
		}
	}

	// Default task.
	grunt.registerTask('default', ['release:patch']);
};