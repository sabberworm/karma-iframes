window['test1-global'] = 'defined';

describe('globals', () => {
	it('should only exist from test1 file', () => {
		expect(window).to.include.all.keys('test1-global');
		expect(window).to.not.include.any.key('test2-global');
	});
	it('from should-be-in-every-iframe.js should exist', () => {
		expect(window).to.include.all.keys('should-be-in-every-iframe');
	});
});

describe('files', () => {
	it('should have something to say about the non-included file', () => {
		expect(window.__karma__.files).to.be.an('object').that.includes.all.keys('/base/test/not-included/should-not-be-tested.js');
	});
});