window['test2-global'] = 'defined';

describe('globals', () => {
	it('should only exist from test2 file', () => {
		expect(window).to.not.include.any.key('test1-global');
		expect(window).to.include.all.keys('test2-global');
	});
	it('from should-be-in-every-iframe.js should exist', () => {
		expect(window).to.include.all.keys('should-be-in-every-iframe');
	});
});