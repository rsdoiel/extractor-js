Scrape
======
revision 0.0.8
--------------

# Scrape(document_or_path, map, options, callback)

The scrape method is used to create to extract content from HTML markup. It
has three required parameters - document_or_path, map, and callback. It has two
optional parameters - cleaner and transformer.

# parameters

## required

* document_or_path - this must be a string of either a HTML document, 
path on local disc or http/https URL. If it is a path or URL then FetchPage() 
will be used to retrieve the document to be processed.
* map - Map is an object which pairs a property name with a CSS style selector.
At this time only trivial selectors are supported (e.g. tags like div, h1, a; 
class specified like css, .myclass; and ids like #myid). These invoke jsDom's 
implementation of getElementsByTagName(), getElementsByClassName() and 
getElementById() respectively. It only returns the first node found for the 
given selector. In the future the selector will call jsDom's implementation of 
querySelectorAll().  The map's properties names correspond the data object passed
to the callback function's second parameter.  E.g. var map = { title:'title',
article:'#article'} would pass an object with title extracted from the title 
element of hte HTML document and the element with the attribute id of article
in those respective properties.
* options - options for processing request (e.g. cleaner and transform functions).
* callback - this is a function to process the results of the page scraped. The
function should accept three parameters - error, data and pathname.
** error - is your typical error object passed in functions like fs.readFile()
** data is an object with property names corresponding to map's property names
but with the property's value containing the scraped results as a string (e.g. 
the innerHTML of the tag)
** env - the environment used to process request (e.g. env.pathname would be the
path to the HTML source)


## options

There are two important options parameters - cleaner and transformer. They must be
JavaScript functions or they are ignored.

* cleaner - if present
and a function will be invoked before the HTML markup is processed with 
window.document.querySelector().  It is usually used to do things like cleanup
encoding, malformed tags or other things which will break jsDom's parse. The
cleaner function must accept one parameter which is the string version of the 
HTML markup and it must returned a string of the cleaned up version of that 
markup.
* transformer - if present this will process the value retrieved via 
window.document.querySelector() before it is handed. transformer() excepts 
two parameters a key and value.  It returns a string which will be assigned to 
the property with the key's name before being handed to the callback.  This is 
helpful if you want to strip tags from the markup you are extracting (E.g. 
font, spacing tags).

# Examples

```javascript
  var extractor = require('extractor'), util = require('util');
	
	var clean = function (source) {
		console.log("clean() would allow you to cleanup the markup before passing to jsdom.");
		console.log("EXAMPLE: Upcasing all the content");
		return source.toUpperCase();
	};
	
	var transform = function (ky, val) {
		var oddeven = 0;
		console.log("transform() process by ky/value pairs allowing modification of attributes found in val.");
		console.log("ky: " + util.inspect(ky));
		console.log("val (before): " + util.inspect(val));
		console.log("EXAMPLE: change values to Lower or Uppercase.");
		Object.keys(val).forEach(function(i) {
			// There is more then on div > h2 so we traverse an array of items that can be processed.
			if (typeof val[i] === 'object') {
				if (val[i].innerHTML !== undefined) {
					if (oddeven) {
						val[i].innerHTML = String(val[i].innerHTML).toLowerCase();
					} else {
						val[i].innerHTML = String(val[i].innerHTML).toUpperCase();
					}
				}
			}
			oddeven = (oddeven + 1) % 2; 
		});
		console.log("val (after): " + util.inspect(val));
		return val;
	};
	
	extractor.Scrape("http://nodejs.org", { title: "title", div_h2: "div > h2" }, { response: true, 
		cleaner:clean, transformer: transform}, function (err, data, env) {
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