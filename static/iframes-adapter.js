// jshint es3: false
// jshint esversion: 6

(function(karma) {
	'use strict';
	
	var isDebug = document.location.href.indexOf('debug.html') > -1;

	function Suite(path) {
		// state is one of
		// • 'pending' (before the total is known)
		// • 'started' (after total is known but before all suites have executed)
		// • 'complete' (when total === finished)
		this.state = 'pending',
		this.fileName = path.match(/\/([^/]+)\.iframe\.html$/)[1];
		this.path = path;
		this.iframe = document.createElement('iframe');
		this.total = NaN,
		this.finished = 0;
	}
	
	Suite.prototype.init = function(suites) {
		if(isDebug) {
			console.debug(`Loaded suite ${this.fileName}`);
		}
		var suite = this;
		// Add the suite as pending
		suites[this.path] = suite;
		
		var iframe = this.iframe;

		// Remap console
		iframe.addEventListener('DOMContentLoaded', () => {
			iframe.contentWindow.console = console;
		}, false);
		
		// Listen to messages from the iFrame
		this.messageListener = (msg) => {
			if(!msg.source || iframe.contentWindow !== msg.source) {
				return; // ignore messages from other iframes
			}

			// Provide some namespace for the message
			if(!Array.isArray(msg.data) || msg.data[0] !== 'iframe-test-results') {
				return;
			}

			var message = msg.data[1];
			var arg = msg.data[2];

			if(message === 'started') {
				this.started(arg);
			} else if(message === 'result') {
				this.result(arg);
			} else if(message === 'complete') {
				this.complete();
			} else {
				// Other message (log, error); send directly to karma
				karma[message].apply(karma, msg.data.slice(2));
			}
		};
		window.addEventListener('message', this.messageListener, false);
	};

	Suite.prototype.run = function() {
		if(isDebug) {
			console.debug(`Running suite ${this.fileName}`);
		}
		this.iframe.src = this.path;
		document.body.appendChild(this.iframe);
	};

	Suite.prototype.started = function(total) {
		if(isDebug) {
			console.debug(`Suite ${this.fileName} has started, expects ${total} tests`);
		}
		this.state = 'started';
		this.total = total;
		suiteStarted();
	};

	Suite.prototype.result = function(result) {
		if(isDebug) {
			console.debug(`Suite ${this.fileName} has a result, ${result}`);
		}
		result.suite = result.suite || [];
		result.suite.unshift(this.fileName.replace(/\.iframe\.html$/, ''));
		result.id = this.fileName+'#'+(result.id || '');
		this.finished++;
		sendResult(result);
	};

	Suite.prototype.complete = function() {
		if(isDebug) {
			console.debug(`Suite ${this.fileName} has completed with ${this.finished} of ${this.total} tests`);
		}
		this.state = 'complete';
		suiteComplete();
		this.cleanup();
	};
	
	Suite.prototype.cleanup = function() {
		this.iframe.parentNode.removeChild(this.iframe);
		window.removeEventListener('message', this.messageListener, false);
		this.iframe = null;
		this.messageListener = null;
	}

	// Map suite files to suite instances
	var suites = {};
	
	function suitesWithState(state) {
		let isNeg = state[0] === '!';
		if(isNeg) {
			state = state.substr(1);
		}
		let result = {};
		Object.keys(suites)
			.filter(path => {
				return isNeg ? suites[path].state !== state : suites[path].state === state;
			})
			.forEach(path => {
				result[path] = suites[path];
			});
		return result;
	};

	function countTests() {
		return Object.keys(suites)
			.map(path => suites[path])
			.reduce(([total, finished], suite) => {
				total += suite.total;
				finished += suite.finished;
				return [total, finished];
			}, [0, 0]);
	}

	function hasPendingSuites() {
		let startedSuites = suitesWithState('!pending');
		return Object.keys(startedSuites).length < Object.keys(suites).length;
	}

	var pendingResults = [];
	function sendResult(result) {
		if(hasPendingSuites()) {
			// We should not send results to karma before all suites have started, queue them
			pendingResults.push(result);
			return;
		}
		// Send result directly
		karma.result(result);
	}
	
	// Some suite has started
	function suiteStarted() {
		// Have all suites started?
		if(hasPendingSuites()) {
			return;
		}
		// All suites have started, send the total to karma
		let [total, finished] = countTests();
		if(isDebug) {
			console.debug(`All ${Object.keys(suites).length} suites have started, expecting ${total} tests (of which ${finished} have already finished)`);
		}
		karma.info({total});
		// Send the pending results
		pendingResults.forEach(sendResult);
		pendingResults = [];
	}

	// Some suite has completed
	function suiteComplete() {
		// Have all suites completed?
		let completedSuites = suitesWithState('complete');
		if(Object.keys(completedSuites).length < Object.keys(suites).length) {
			return;
		}
		// All suites have completed, send the “complete” message to karma
		if(isDebug) {
			let [total, finished] = countTests();
			console.debug(`All ${Object.keys(suites).length} suites have completed, ran ${finished} of ${total} tests`);
		}
		karma.complete();
	}

	function start() {
		// jshint validthis: true
		var files = Object.keys(karma.files).filter(file => file.match(/\.iframe\.html$/));

		files.forEach(file => {
			let suite = new Suite(file);
			suite.init(suites);
			suite.run();
		});
	}

	karma.start = start;
})(window.__karma__);

