let fs = require('fs');
let path = require('path');

// let testFiles;

let IFRAMES_ADAPTER = require.resolve('../static/iframes-adapter.js');
let REVERSE_CONTEXT = require.resolve('../static/reverse-context.js');

let transformedContextDir = require('tmp').dirSync().name;

let nonIncludedFiles = [];

function IFrameFramework(files, preprocessors, config, logger) {
	let log = logger.create('framework:iframes');

	// Install middleware that transforms the output
	config.beforeMiddleware = config.beforeMiddleware || [];
	config.beforeMiddleware.push('iframes');
	
	files.forEach(file => {
		if(!file.included) {
			nonIncludedFiles.push(file);
		} else {
			file.included = false;
			log.debug(`Remove include for file ${file.pattern}`);
		}
	});
	
	files.unshift({
		pattern: REVERSE_CONTEXT,
		included: false,
		served: true,
		watched: false
	});
	files.push({
		pattern: IFRAMES_ADAPTER,
		included: true,
		served: true,
		watched: false
	});
}

IFrameFramework.$inject = ['config.files', 'config.preprocessors', 'config', 'logger'];

module.exports = {IFrameFramework, nonIncludedFiles, REVERSE_CONTEXT};
