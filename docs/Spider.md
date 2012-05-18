spider
======
revision 0.1.0
--------------

# Overview

Spider is a specialized scraping method which returns an object with a collection of links and assets. The links can be used
to spider other documents and follow a web tree.  The assets object can be used to inspect or retrieve assets found in the HTML 
markup spidered.

# Example

```javascript
  var extractor = require('extractor'), util = require('util');
	
	extractor.spider("http://nodejs.org", { response: true }, function (err, data, env) {
		if (err) {
			console.error('ERROR: ' + err);
		}
		if (data) {
			console.log('data: ' + JSON.stringify(data));
		}
		if (env) {
			console.log('http return status code: ' + env.response.statusCode);
		}
	});
```