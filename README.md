extractor-js
============
revision 0.0.5
--------------

# Overview

Periodically I wind up scripting some screen scraping or spidering sites to check links.  Node is really nice for this.
extractor-js is a couple of utility methods I've found I reuse allot in these types of script.

## Three methods

extractor has three methods -

* `FetchPage` - get a page from the local file system or via http/https
* `Scrape` - A combination of FetchPage(), Cleaner(), and Transformer() which fetches the content, parses it via 
 jsDOM/jQuery and extracting interesting parts based on the jQuery selectors pass to it creating an object with 
the same structure as the selector object and passing it to Scrape()'s callback method. You can override the Cleaner()
and Transformer() methods by passing in your own cleaner and transformer functions.
* `Spider` - a utily implementation of Scrape using a fixed map for anchors, links, scripts and image tags.

# Example (Scrape)

```javascript
var extractor = require('extractor-js'),
pages  = ["http://example.com/article1.html", 
	"http://example.com/article2.html",
	"http://example.com/article3.html"
	],
selector = { 'title':'.title > h2', 'deck' : 'div.deck',
	'author' : 'span.author', 'published':'span.date',
	'article': '.main_copy'},
	i = 0;

pages.forEach(function(page) {
	extractor.Scrape(page, selector, function (err, data, page_name) {
		if (err) throw err;
		
		console.log("Processed " + page_name);
		console.log("Article record: " + JSON.stringify(data));
	});
});
```

This example script would process three pages from the pages array and output a console log of the processed page 
and a JSON representation of the content described by the selectors.

# Example (Spider)

In this example we spider the homepage of the NodeJS website and list of the links found on the page.

```javascript
var extractor = require('extractor');

extractor.Spider('http://nodejs.org', function(err, data, url) {
	var i;
	if (err) {
		console.error("ERROR: " + err);
	}
	console.log("from -> "+ url);
	console.log("data -> " + JSON.stringify(data));
	for(i = 0; i < data.links.length; i += 1) {
		console.log("Link " + i + ": " + data.links[i].href);
	}
});
```