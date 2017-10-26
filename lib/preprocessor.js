let fs = require('fs');

let TEMPLATE = fs.readFileSync(require.resolve('karma/static/context.html'), {encoding: 'utf-8'});

function IFramePreprocessor(logger) {
	let log = logger.create('preprocessor:iframes');

	return function handleFile(content, file, done) {
		log.debug(`Processing ${file.path} to be loaded separately into iframe`);
		// Add matchable suffix to identify (and for correct mime-typing)
		file.path += '.iframe.html';

		let template = TEMPLATE
			// Add token that the middleware can replace with the path to the reverse-context.js script
			.replace('src="context.js"', `src="%REVERSE_CONTEXT%"`)
			// Inline the test script into the page
			// FIXME: 1. This does not preserve the script order but inserts the script always at the end
			// FIXME: 2. This might break with scripts that contain the `</script>` or `!]]` tokens.
			.replace('%SCRIPTS%', `
%SCRIPTS%
<script type="text/javascript"><!--//--><![CDATA[//><!--
	${content}
//--><!]]></script>
`);

		done(template);
	};
}

IFramePreprocessor.$inject = ['logger'];

module.exports = IFramePreprocessor;