window['test2-global'] = 'defined';

describe('globals', () => {
	it('should only exist from test2 file', () => {
	expect('test1-global' in window).to.be.false
	expect('test2-global' in window).to.be.true
	});
});