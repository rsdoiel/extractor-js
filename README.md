extractor-js
============
revision 0.0.1
--------------

# Overview

Periodically I wind up scripting some screen scraping.  Node is really nice for this.  extractor-js is a couple of utility methods I've found I reuse allot in these types of script.

## Four methods

extractor has four methods -

* FetchPage - get a page from the local file system or via http/https
* Cleaner - do some basic cleanup of the html document. This can be overwritten by passing your own cleaner function to Scrape().
* Transformer - a simple function that strips font tags from the content. Can be overwritten by passing your own transformer function to Scrape.
* Scrape - A combination of FetchPage(), Cleaner(), and Transformer() which fetches the content, parses it via jsDOM/jQuery and extracting interesting parts based on the jQuery selectors pass to it creating an object with the same structure as the selector object and passing it to Scrape()'s callback method. You can override the Cleaner() and Transformer() methods by passing in your own cleaner and transformer functions.

# Example

	var extractor = require('extractor-js'),
	pages  = ["http://example.com/article1.html", 
		"http://example.com/article2.html",
		"http://example.com/article3.html"
		],
	selector = { 'title':'.title > h2', 'deck' : 'div.deck',
		'author' : 'span.author', 'published':'span.date',
		'article': '.main_copy'},
		i = 0;
	
	for (i = 0; i < pages.length; i += 1) {
		page = pages[i];
		extractor.Scrape(page, selector, function (err, data, page_name) {
			if (err) throw err;
			
			console.log("Processed " + page_name);
			console.log("Article record: " + JSON.stringify(data));
		});
	}
	

This example script would process three pages from the pages array and output a console log of the processed page and a JSON representation of the content described by the selectors.
