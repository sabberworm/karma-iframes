let common = require('karma/lib/middleware/common');

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
		.filter(file => !nonIncludedFiles.some(pattern => pattern.match(file.originalPath)))
		// Don’t include the reverse context (it is included by the `transform` function below)
		.filter(file => file.originalPath !== REVERSE_CONTEXT);
	return files;
}

function createMiddleware(logger, fileList, emitter, injector) {
	let log = logger.create('middleware:iframes');

	function rewrite(res, req, next, transformer) {
		let write = res.write;
		res.write = function writeRewritten(chunk, ...args) {
			chunk instanceof Buffer && (chunk = chunk.toString());
			try {
				chunk = transformer(chunk, req);
			} catch(e) {
				log.error('failed to apply transformer', e);
			}
			write.call(this, chunk, ...args);
		};
		next();
	}

	let filesPromise = createFilesPromise(fileList, emitter);
	
	function transform(files, chunk, req) {
		let basePath = injector.get('config.basePath');
		let urlRoot = injector.get('config.urlRoot');
		let upstreamProxy = injector.get('config.upstreamProxy');
		let proxyPath = upstreamProxy ? upstreamProxy.path : '/';

		let reverseContextFile = files.served.find(file => file.originalPath === REVERSE_CONTEXT);
		if (!reverseContextFile.isUrl) {
			reverseContextFile = filePathToUrlPath(reverseContextFile.path, basePath, urlRoot, proxyPath);
		} else {
			reverseContextFile = reverseContextFile.path;
		}

		log.debug(`Adding reverse context file ${reverseContextFile} to chunk ${typeof chunk}(${chunk.length})`);

		chunk = chunk.replace('%REVERSE_CONTEXT%', reverseContextFile);
		return includeScriptsIntoContext(includeServedOnly(files), log, injector, chunk, req);
	}

	return function middleware(req, res, next) {
		if(!isIFrameHtml(req.url)) {
			return next();
		}

		log.debug(`Rewriting script includes in ${req.url}`);

		filesPromise.then((files) => {
			rewrite(res, req, next, transform.bind(null, files));
		}, (errorFiles) => {
			rewrite(res, req, next, includeErrorIntoContext.bind(null, errorFiles, log, injector));
		});
	};
}

createMiddleware.$inject = ['logger', 'fileList', 'emitter', 'injector'];

module.exports = createMiddleware;