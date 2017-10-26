window['test1-global'] = 'defined';

describe('globals', () => {
	it('should only exist from test1 file', () => {
		expect('test1-global' in window).to.be.true
		expect('test2-global' in window).to.be.false
	});
});

describe('files', () => {
	it('should have something to say about the non-included file', () => {
		expect(window.__karma__.files).to.be.an('object').that.includes.all.keys('/base/test/not-included/should-not-be-tested.js');
	});
});