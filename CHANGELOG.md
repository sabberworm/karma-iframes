# Changelog

## 1.2

### 1.2.0

* Support code coverage (thanks to [@thealien](https://github.com/thealien))
* Fix error in serve-file-middleware that made 404 requests crash the server (noticeable when the browser tried to load source maps).

### 1.2.1

* Output a list of deep-links to individual suites in debug mode.

### 1.2.2

* Serialize error objects so they can be passed to the parent context.

## 1.1

### 1.1.0

* Be more robust to JS formatting by serving and including the JS instead of inlining.

### 1.1.1

* Serve resolved files correctly on windows, thanks to [@Aquariuslt](https://github.com/Aquariuslt).

### 1.1.2

* Easier debugging of individual suites, even after reload.
* Allow query params after requests to iframe or its script.

## 1.0

### 1.0.1

* Fixed an embarrassing mistake where not all required files had actually been in the npm package.

### 1.0.0

* First public release
