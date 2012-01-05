extractor-js
============
revision 0.0.7f
---------------

# Overview

Periodically I wind up writing scripts to screen scrape or spider sites.  Node  is really nice for this. extractor-js is a utility module for these types of script.

## Three methods

extractor has three methods -

* `FetchPage` - get a page from the local file system or via http/https
* `Scrape` - A combination of FetchPage(), Cleaner(), and Transformer() which fetches the content, parses it via 
 jsDOM/jQuery and extracting interesting parts based on the jQuery selectors pass to it creating an object with 
the same structure as the selector object and passing it to Scrape()'s callback method. You can override the Cleaner()
and Transformer() methods by passing in your own cleaner and transformer functions.
* `Spider` - a utility implementation of Scrape using a fixed map for anchors, links, scripts and image tags.
* `SubmitForm` - a way to send form data and get a response. Supported forms use either GET or POST methods.

# Example (Scrape)

```javascript
var extractor = require('extractor'),
pages  = [ 'http://nodejs.org', 'http://golang.org'],
selector = {
	'page_title':'title',
	'titles' :'h2',
	'js' : 'script[type=text/javascript]',
	'css' : 'link[type=text/css]',
	'about_as_id' : '#about',
	'about_as_class' : '.about'
    };

pages.forEach(function(page) {
    extractor.Scrape(page, selector, function (err, data, page_name) {
        if (err) throw err;

        console.log("Processed " + page_name);
        console.log("Page record: " + JSON.stringify(data));
    });
});
```


This example script would process three pages from the pages array and output a console log of the processed page and a JSON representation of the content described by the selectors.


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

