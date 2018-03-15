let fs = require('fs');

let common = require('karma/lib/middleware/common');

let TMP_STATIC_FILES_DIR = require('tmp').dirSync().name;
let STATIC_PREFIX = '/iframes-static/';

function createStaticFileMiddleware(logger, injector) {
	let log = logger.create('middleware:iframes-serve-file');
  var config = injector.get('config');
	var serveFile = common.createServeFile(fs, null, config)

	return function staticFileMiddleware(req, res, next) {
		if(req.url.indexOf(STATIC_PREFIX) !== 0) {
			return next();
		}
		
		let file = `${TMP_STATIC_FILES_DIR}/${req._parsedUrl.pathname.substr(STATIC_PREFIX.length)}`;
		
		log.debug(`Searching for file to ${req.url} in ${file}`);

		fs.stat(file, (err, stats) => {
			if(err) {
				log.error(`fs.stat(${file}) errored with`, err);
			}
			if(err || !stats.isFile()) {
				log.debug(`No match found for ${file}`);
				return next(err);
			}
			var rangeHeader = req.headers['range'];
			fs.readFile(file, (err, data) => {
				serveFile(file, rangeHeader, res, () => {
					if (/\?\w+/.test(req.url)) {
						// files with timestamps - cache one year, rely on timestamps
						common.setHeavyCacheHeaders(res)
					} else {
						// without timestamps - no cache (debug)
						common.setNoCacheHeaders(res)
					}
				}, data, true);
			});
		});
	};
}

createStaticFileMiddleware.$inject = ['logger', 'injector'];

module.exports = {TMP_STATIC_FILES_DIR, STATIC_PREFIX, createStaticFileMiddleware};