window['test1-global'] = 'defined';

describe('globals', () => {
	it('should only exist from test1 file', () => {
		expect('test1-global' in window).to.be.true
		expect('test2-global' in window).to.be.false
	});
});