/**
 * File replicates some functionality from karma/lib/middleware/karma.js
 * to write script tags and file lists into the context (which, in our case, is the one from iframes);
 * 
 * Heavily modified. It would be cool to not have to do this.
 * Karma could expose many of these helper functions via modules/DI.
 * But it does not do this, so we have to copy-paste on changes.
 */

let path = require('path');
let url = require('url');
let util = require('util')

var SCRIPT_TAG = '<script type="%s" src="%s" %s></script>';
var CROSSORIGIN_ATTRIBUTE = 'crossorigin="anonymous"';
var LINK_TAG_CSS = '<link type="text/css" href="%s" rel="stylesheet">';
var LINK_TAG_HTML = '<link href="%s" rel="import">';
var SCRIPT_TYPE = {
	'.js': 'text/javascript',
	'.dart': 'application/dart'
};

var urlparse = function (urlStr) {
	var urlObj = url.parse(urlStr, true)
	urlObj.query = urlObj.query || {}
	return urlObj
}

var isFirefox = function (req) {
	if (!(req && req.headers)) {
		return false
	}

	// Browser check
	var firefox = useragent.is(req.headers['user-agent']).firefox

	return firefox
}
var getXUACompatibleMetaElement = function (url) {
	var tag = ''
	var urlObj = urlparse(url)
	if (urlObj.query['x-ua-compatible']) {
		tag = '\n<meta http-equiv="X-UA-Compatible" content="' +
			urlObj.query['x-ua-compatible'] + '"/>'
	}
	return tag
}

function filePathToUrlPath(filePath, basePath, urlRoot, proxyPath) {
	if (filePath.indexOf(basePath) === 0) {
		return proxyPath + urlRoot.substr(1) + 'base' + filePath.substr(basePath.length)
	}

	return proxyPath + urlRoot.substr(1) + 'absolute' + filePath
}

// Resolve handler callback to `filesPromise.then`
// as used in `if (isRequestingContextFile || isRequestingDebugFile || isRequestingClientContextFile)`
exports.includeScriptsIntoContext = function(files, log, injector, context, request) {
  let client = injector.get('config.client');
	let jsVersion = injector.get('config.jsVersion');
	let includeCrossOriginAttribute = injector.get('config.crossOriginAttribute');
	let basePath = injector.get('config.basePath');
	let urlRoot = injector.get('config.urlRoot');
	let upstreamProxy = injector.get('config.upstreamProxy');
	let proxyPath = upstreamProxy ? upstreamProxy.path : '/';

	// log.error('files', files);
	var scriptTags = []
	var scriptUrls = []
	for (var i = 0; i < files.included.length; i++) {
		var file = files.included[i]
		var filePath = file.path
		var fileExt = path.extname(filePath)

		if (!files.included.hasOwnProperty(i)) {
			continue
		}

		if (!file.isUrl) {
			filePath = filePathToUrlPath(filePath, basePath, urlRoot, proxyPath)
		}

		scriptUrls.push(filePath)

		if (fileExt === '.css') {
			scriptTags.push(util.format(LINK_TAG_CSS, filePath))
			continue
		}

		if (fileExt === '.html') {
			scriptTags.push(util.format(LINK_TAG_HTML, filePath))
			continue
		}

		// The script tag to be placed
		var scriptType = (SCRIPT_TYPE[fileExt] || 'text/javascript')

		// In case there is a JavaScript version specified and this is a Firefox browser
		if (jsVersion && jsVersion > 0 && isFirefox(request)) {
			scriptType += ';version=' + jsVersion
		}

		var crossOriginAttribute = includeCrossOriginAttribute ? CROSSORIGIN_ATTRIBUTE : ''
		scriptTags.push(util.format(SCRIPT_TAG, scriptType, filePath, crossOriginAttribute))
	}

	// TODO(vojta): don't compute if it's not in the template
	var mappings = files.served.map(function (file) {
		// Windows paths contain backslashes and generate bad IDs if not escaped
		var filePath = filePathToUrlPath(file.path, basePath, urlRoot, proxyPath).replace(/\\/g, '\\\\')
		// Escape single quotes that might be in the filename -
		// double quotes should not be allowed!
		filePath = filePath.replace(/'/g, '\\\'')

		return util.format("	'%s': '%s'", filePath, file.sha)
	})

	var clientConfig = 'window.__karma__.config = ' + JSON.stringify(client) + ';\n'

	var scriptUrlsJS = 'window.__karma__.scriptUrls = ' + JSON.stringify(scriptUrls) + ';\n'

	mappings = 'window.__karma__.files = {\n' + mappings.join(',\n') + '\n};\n'

	return context
		.replace('%SCRIPTS%', scriptTags.join('\n'))
		.replace('%CLIENT_CONFIG%', clientConfig)
		.replace('%SCRIPT_URL_ARRAY%', scriptUrlsJS)
		.replace('%MAPPINGS%', mappings)
		.replace('\n%X_UA_COMPATIBLE%', getXUACompatibleMetaElement(request.url));
}

// Reject handler callback to `filesPromise.then`
// as used in `if (isRequestingContextFile || isRequestingDebugFile || isRequestingClientContextFile)`
exports.includeErrorIntoContext = function(errorFiles, log, injector, context) {
	log.error('Error resolving files', errorFiles);
	return context.replace('%SCRIPTS%', '').replace('%CLIENT_CONFIG%', '').replace('%MAPPINGS%',
		'window.__karma__.error("TEST RUN WAS CANCELLED because ' +
		(errorFiles.length > 1 ? 'these files contain' : 'this file contains') +
		' some errors:\\n	 ' + errorFiles.join('\\n	 ') + '");');
}

exports.filePathToUrlPath = filePathToUrlPath;