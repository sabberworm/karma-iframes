let path = require('path');

let common = require('karma/lib/middleware/common');
let minimatch = require('minimatch');

let {includeScriptsIntoContext, includeErrorIntoContext, filePathToUrlPath} = require('./includer.js');

let {nonIncludedFiles, REVERSE_CONTEXT} = require('./framework.js');

// Replicate filesPromise functionality from webServer.
// Unfortunately we can’t access the webServer child DI injector
// from here where the filesPromise lives.
function createFilesPromise(fileList, emitter, basePath) {
	var filesPromise = new common.PromiseContainer();
	// Set an empty list of files to avoid race issues with
	// file_list_modified not having been emitted yet
	filesPromise.set(Promise.resolve(fileList.files));
	emitter.on('file_list_modified', function (files) {
		filesPromise.set(Promise.resolve(files))
	});
	return filesPromise;
}

function isIFrameHtml(url) {
	return /\.iframe\.html$/.test(url);
}

// Reverse included and served files
function includeServedOnly(files) {
	files = Object.assign({}, files);
	let oldIncluded = files.included;
	files.included = files.served
		// Don’t include the files that are included in the outer context
		.filter(file => oldIncluded.indexOf(file) === -1)
		// Don’t include this (or other) contexts
		.filter(file => !isIFrameHtml(file.path))
		// Don’t include files that were never included to begin with (before the framework ran)
		// FIXME: find the most specific applicable pattern first
		.filter(file => !nonIncludedFiles.some(pattern => minimatch(file.originalPath, pattern.pattern)))
		// Don’t include the reverse context (it is included by the `transform` function below)
		.filter(file => file.originalPath !== REVERSE_CONTEXT);
	return files;
}

function createContextRewriteMiddleware(logger, fileList, emitter, injector) {
	let log = logger.create('middleware:iframes-rewrite');
	
	function rewrite(res, req, next, transformer) {
		log.debug(`Rewriting request to ${req.url} with ${transformer.displayName || transformer.name}`);
		let end = res.end;
		// Monkey-patch res.end to rewrite the response using the transformer passed
		res.end = function endRewritten(chunk, ...args) {
			chunk instanceof Buffer && (chunk = chunk.toString());
			try {
				chunk = transformer(chunk, req);
			} catch(e) {
				log.error('failed to apply transformer', e);
			}
			end.call(this, chunk, ...args);
		};

		next();
	}

	let filesPromise = createFilesPromise(fileList, emitter);
	
	function transform(files, chunk, req) {
		let basePath = injector.get('config.basePath');
		let urlRoot = injector.get('config.urlRoot');
		let upstreamProxy = injector.get('config.upstreamProxy');
		let proxyPath = upstreamProxy ? upstreamProxy.path : '/';
		
		let reverseContextFile = files.served.find(file => {
      return file.originalPath === REVERSE_CONTEXT || file.originalPath === REVERSE_CONTEXT.split(path.sep).join('/');
		});
		if (!reverseContextFile.isUrl) {
			reverseContextFile = filePathToUrlPath(reverseContextFile.path, basePath, urlRoot, proxyPath);
		} else {
			reverseContextFile = reverseContextFile.path;
		}

		log.debug(`Adding reverse context file ${reverseContextFile} to chunk ${typeof chunk}(${chunk.length})`);

		chunk = chunk.replace('%REVERSE_CONTEXT%', reverseContextFile);
		return includeScriptsIntoContext(includeServedOnly(files), log, injector, chunk, req);
	}

	return function contextRewriteMiddleware(req, res, next) {
		if(!isIFrameHtml(req.url)) {
			return next();
		}

		log.debug(`Rewriting script includes in ${req.url}`);

		filesPromise.then((files) => {
			rewrite(res, req, next, transform.bind(null, files));
		}, (errorFiles) => {
			debug.error('Could not resolve files', errorFiles);
			rewrite(res, req, next, includeErrorIntoContext.bind(null, errorFiles, log, injector));
		});
	};
}

createContextRewriteMiddleware.$inject = ['logger', 'fileList', 'emitter', 'injector'];

module.exports = createContextRewriteMiddleware;