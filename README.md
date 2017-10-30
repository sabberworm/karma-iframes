# What is `karma-iframes`? [![CI status](https://api.travis-ci.org/sabberworm/karma-iframes.svg?branch=master)](https://travis-ci.org/sabberworm/karma-iframes)

It’s a Karma plugin that lets you run each test in a separate context, loaded as an iframe.

Essentially, it will let you designate a set of files as running each in a separate context. A test designated this way will run in a new iframe, isolated from every other test file designated thusly.

This means you can pollute the global namespace all you want in one test without affecting the other (see [karma-runner/karma#412](https://github.com/karma-runner/karma/issues/412)).

## Why is this useful?

Preprocessors that package a test file plus all its dependencies into a single file (think TypeScript in its `--outFile --module` mode or `karma-webpack`) can sometimes end up packaging the same dependency multiple times. This plugin won’t fix that but it will mitigate its effects. For example, if you have a file that `require`s `'jquery'` and then exports `$` to `window.$` and you include this file from multiple tests, only the one instance of jQuery that is loaded last will actually be global but it may or may not have all required jQuery plugins registered to it, depending on which entry file they were included in.

Also, some older frameworks (Ext, Prototype) might require certain globals to exist in specific places.

## Are there any drawbacks?

Sure, as always:

* When focusing on a test (e.g. using Jasmine’s `fit`, or QUnit’s `only`), you’ll only be focusing on this test within the suite/file it belongs, not the whole test set. This might not be what you want.
* Instrumentation/coverage reports most likely won’t work (or, at the least, won’t be accurate). I have not tested this.
* Creating a new context incurs some costs, both in the karma server as well as in the client code. You should be able to mitigate this by setting `runInParent` to `true`, to nest the iframes only 1 level deep instead of 2.
* The plugin messes with some karma internals and might not be compatible with all configurations/plugins.
* For it to work, all files you want separated have to not depend on each other. You can only include each file either in all iframes or only in one. Slicing arbitrarily is not supported.

## How does it work?

The plugin will prevent the test files from being directly included in the test runner context. Instead it will only add one adapter that loops through all the designated files, and create an iframe for each.

These iframes each load an HTML file similar to the normal karma context: it includes the normal test adapter and all ambient files but of the designated files it will only contain a single one. It will also include an additional file which I lovingly call the “reverse context”. This will provide the `__karma__` global that is necessary for the test adapter to notify the test results.

This reverse context will talk to the iframe adapter on the parent context using the `postMessage` API.

## Configuration

To use the plugin, install it first:

```bash
npm install --save-dev karma-iframes
```

Then, add it to the `plugins` section of your `karma.conf.js`:

```javascript
	[…]
	plugins: [
		[…],
		'karma-iframes'
	],
	[…]
```

To use it, add it as a framework:

```javascript
	[…]
	frameworks: [
		[…],
		'iframes'
	],
	[…]
```

Most likely you’ll want to list `'karma-iframes'` as the last item in `frameworks`.
Any file included by a later framework will be included into the test runner context but not the iframe context. This might be needed in some cases, e.g. for frameworks that extend the way the karma client talks to the server, but it’s not the common case.

Lastly, mark the files you want separated with the `iframes` preprocessor:

```javascript
	[…]
	preprocessors: {
		[…],
		'test/modules/**/*.js': ['iframes']
	},
	[…]
```

of course, you can combine this with other preprocessors:

```javascript
	[…]
	preprocessors: {
		[…],
		'test/modules/**/*.js': ['webpack', 'iframes'],
		'test/modules/**/*.ts': ['typescript', 'iframes']
	},
	[…]
```

In the list of preprocessors for a pattern, I can’t think of a single reason why you’d not want the `'iframes'` preprocessor to be last (unless some other plugin comes along, designed specifically to extend karma-iframes).
