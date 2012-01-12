FetchPage
=========
revision 0.0.8
--------------

# FetchPage(pathname, options, callback)

This is a method to simplify reading HTML documents from either local disc or via http/https connects. FetchPage() is used by Scrape() to retrieve HTML content if a URL or path is provided.


## parameters

* pathname - can be a local file path or a url with the http or https protocol.
* options - an object with properties set option values. (E.g. options.response = true would include response data received from a http/https request).
* callback - this is a javascript function accepting three parameters - error, data, pathname. The error is an error object like those support by fs.readFile(). Data is a buffer streaming like thsoe passed by fs.readFile(). The last parameter, pathname, is the origin path or url requested. It is a convientance parameter used by extractor's Scrape() function.

# Examples

```javascript
var extractor = require('extractor');

extractor.FetchPage("http://nodejs.org",{ response: true}, function (err, data, env) {
  if (err) {
		console.error('ERROR: ' + err);
	}
	if (data) {
		console.log('html: ' + data.toString());
	}
	if (env) {
		console.log('http return status code: ' + env.response.statusCode);
	}
});
```

