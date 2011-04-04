desc('Install required npm modules');
task('install-npm-depends', [], function () {

	// Get npm programatically and the fs module
	var npm = require('/usr/local/lib/node_modules/npm/npm'),
			fs = require("fs");

	// Load npm
	npm.load({}, function (error) {

		if (error) {
			console.log("Cannot load npm");
			throw error;
		} else {
			
			// Read in and parse dependencies file
			var depends = JSON.parse(fs.readFileSync('config/npm-depends.json')),

					// Count number of packages to install
					// because we're going to do it async
					// and will need to know when the last
					// one is done, set callback to decrement
					// count every time a package finishes
					toInstall = depends.length,
					afterInstall = function () {
						toInstall = toInstall - 1;
						if (toInstall === 0) {
							// Signify that the task is complete
							complete();
						}
					};

			console.log("Installing " + toInstall + " package(s) and their dependencies...");
			
			// Install the packages
			depends.forEach(function (d) {
				npm.commands.install([d], afterInstall);
			
			});
		
		}

	});

}, true);

// Initialise properties
var properties = null,
		versionedPath = null,
		livePath = null;

desc('Loads in properties file');
task('load-props', ["install-npm-depends"], function() {

	console.log("Attempting to read in build properties");
	
	var fs = require("fs");
	
	// Read in and parse build properties
	properties = JSON.parse(fs.readFileSync('config/props.json'));
	
	// Print the properties to the console
	console.log("Properties:");
	for (var p in properties) {
		if (properties.hasOwnProperty(p)) {
			console.log(p + properties[p]);
		}
	}
	
	// Build some paths from properties for use later on
	versionedPath = properties.siteLocation + properties.state + "/.versions/" +
									properties.siteName + "@" + properties.version;
	livePath = properties.siteLocation + properties.state + "/" + properties.siteName;

	console.log("Properties read successfully");

	complete();

}, true);

desc('Create versioned site directory');
task('create-versioned-dir', ["load-props"], function() {
	
	console.log("Attempting to create versioned directory");

	var exec = require('child_process').exec,
			mkdir;
	
	// Create versioned directory
	mkdir = exec("mkdir " + versionedPath, function (error, stdout, stderr) {
		if (error !== null) {
			console.log(error.message);
			throw error;
		} else {
			console.log("Versioned directory created successfully - " + versionedPath);
			complete();
		}
	});

}, true);

desc('Move files to desired location');
task('move-files', ["load-props", "create-versioned-dir"], function() {

	console.log("Attempting to moved files into desired location");

	var exec = require('child_process').exec,
			rsync;
	
	// Move files from temporary directory to versioned directory just created
	rsync = exec("rsync -av . " + versionedPath, function (error, stdout, stderr) {
		if (error !== null) {
			console.log(error.message);
			throw error;
		} else {
			console.log("Files moved successfully");
			complete();
		}
	});

}, true);

desc('Symlink new version');
task('symlink-live', ["load-props", "create-versioned-dir", "move-files"], function() {

	console.log("Attempting to make a symbolic link");

	var exec = require('child_process').exec,
			ln;
	
	// Symlink to the versioned directory
	ln = exec("ln -sv " + versionedPath + " " + livePath, function (error, stdout, stderr) {
		if (error !== null) {
			console.log(error.message);
			throw error;
		} else {
			console.log("Symlink created");
			complete();
		}
	});

}, true);

desc('Puts the development site live');
task('default', ["load-props", "create-versioned-dir", "move-files", "symlink-live"], function() {
	console.log("Attempting to kill old instance of site");

	var exec = require('child_process').exec,
			spawn = require('child_process').spawn,
			upstart;
	
	// Stop the old version of the app and start the new version with upstart
	upstart = exec("sudo stop site." + properties.siteName + "-" + properties.state, function (error, stdout, stderr) {
		console.log("Attempting to start new instance of site");
		exec("sudo start site." + properties.siteName + "-" + properties.state, function (error, stdout, stderr) {
			complete();
		});
	});

});

