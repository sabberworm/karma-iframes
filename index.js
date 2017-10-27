exports['framework:iframes'] = ['factory', require('./lib/framework.js').IFrameFramework];
exports['middleware:iframes-rewrite'] = ['factory', require('./lib/rewrite-middleware.js')];
exports['middleware:iframes-serve-file'] = ['factory', require('./lib/serve-file-middleware.js').createStaticFileMiddleware];
exports['preprocessor:iframes'] = ['factory', require('./lib/preprocessor.js')];
