// jshint es3: false
// jshint esversion: 6

(function(karma) {
	'use strict';

	var pending = {};
	var total = 0;


	function finished(update) {
		if(Object.keys(pending).length > 0) {
			if(document.location.href.indexOf('debug.html') > -1) {
				console.debug(`Still ${Object.keys(pending).length} tests pending`, Object.keys(pending));
			}
			return;
		}

		console.info('All tests done.');

		update.complete();
	}

	function runTest(file, update) {
		pending[file] = true;
		var iframe = document.createElement('iframe');
		iframe.addEventListener('load', function() {
			// Remap console
			iframe.contentWindow.console = console;
		}, false);
		iframe.src = file+'#karma';


		window.addEventListener('message', function(msg) {
			if(!msg.source || iframe.contentWindow !== msg.source) {
				return; // ignore messages from other iframes
			}

			if(!Array.isArray(msg.data) || msg.data[0] !== 'qunit-test-results') {
				return;
			}

			var [, result] = msg.data;

			var fileName = file.match(/\/([^/]+)/)[1];
			Object.keys(result.modules).forEach(moduleName => {
				var tests = result.modules[moduleName].tests;
				Object.keys(tests).forEach(testName => {
					var assertions = tests[testName].assertions;
					total += assertions.length;
					update.info({
						// count number of tests in each of the modules
						total: total
					});
					assertions.forEach((assertion, i) => {
						update.result({
							id: tests[testName].stats.testId+'#'+i,
							description: String(assertion.message||assertion.expected||''),
							suite: [fileName, moduleName, testName],
							success: assertion.result,
							time: assertion.runtime/1000,
							skipped: assertion.skipped,
							log: !assertion.result && ['expected', assertion.expected, 'actual', assertion.actual]
						});
					});
				});
			});

			delete pending[file];
			finished(update);

		}, false);
		document.body.appendChild(iframe);
	}

	function start() {
		// jshint validthis: true
		var update = this;
		var files = Object.keys(karma.files)
			.filter(file => file.indexOf('qunit-tests') > -1)
			.filter(file => file.match(/\.html$/));

		files.forEach(test => runTest(test, update));
	}

	karma.start = start;
})(window.__karma__);

