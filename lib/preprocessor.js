let fs = require('fs');

let TEMPLATE = fs.readFileSync(require.resolve('karma/static/context.html'), {encoding: 'utf-8'});

let {TMP_STATIC_FILES_DIR, STATIC_PREFIX} = require('./serve-file-middleware.js');

function IFramePreprocessor(logger) {
	let log = logger.create('preprocessor:iframes');

	return function handleFile(content, file, done) {
		log.debug(`Processing ${file.path} to be loaded separately into iframe`);

		// Add matchable suffix to identify (and for correct mime-typing)
		// Avoid renaming the file multiple times after a watch-reload
		file.path = `${file.contentPath ? file.path : file.originalPath}.iframe.html`;

		let transformedFilePath = file.originalPath.replace(/(\/|\\)/g, '_') + '.js';

		let template = TEMPLATE
			// Add token that the middleware can replace with the path to the reverse-context.js script
			.replace('src="context.js"', `src="%REVERSE_CONTEXT%"`)
			// Inline the test script into the page
			// FIXME: This does not preserve the script order but inserts the script always at the end
			.replace('%SCRIPTS%', `
%SCRIPTS%
<script type="text/javascript" src="${STATIC_PREFIX}${transformedFilePath}"></script>
`);
		
		// Save the file contents to the temp dir for serving it later
		fs.writeFile(`${TMP_STATIC_FILES_DIR}/${transformedFilePath}`, content, (err) => {
			if(err) {
				log.error('Error writing file befor transformation', err);
			}
			done(template);
		});

	};
}

IFramePreprocessor.$inject = ['logger'];

module.exports = IFramePreprocessor;