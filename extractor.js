/**
 * extractor.js - A simple jsDom/jQuery screen scraper utility library.
 * It's helpful where you need to scrape content via http/https or from
 * a mirrored copy on your file system.
 *
 * author: R. S. Doiel, <rsdoiel@gmail>
 *
 * copyright (c) 2011 all rights reserved
 *
 * Released under New the BSD License.
 * See: http://opensource.org/licenses/bsd-license.php
 *
 */
var	url = require('url'),
	fs = require('fs'),
	path = require('path'),
	http = require('http'),
	https = require('https'),
	jsdom = require('jsdom'),
	jquery = fs.readFileSync("./jquery-1.5.js").toString();


/**
 * FetchPage - read a file from the local disc or via http/https
 * @param pathname - a disc path or url to the document you want to
 * read in and process with the callback.
 * @param callback - the callback you want to run when you have the file. The 
 * callback will be passed an error, data (buffer stream) and the path where it came from.
 */
FetchPage = function(pathname, callback) {
	var pg, parts, options = {};
	// Are we looking at the file system or a remote URL?
	parts = url.parse(pathname);
	options.host = parts.hostname;
	if (parts.pathname === undefined) {
		options.path = '/';
	} else {
		options.path = parts.pathname;
	}
	// Process based on our expectations of where to read from.
	if (parts.protocol === undefined || parts.prototcol === 'file:') {
		fs.readFile(path.normalize(parts.pathname), function(err, data) {
			return callback(err, data, pathname);
		});
	} else {
		switch (parts.protocol) {
		case 'http:':
			if (parts.port === undefined) {
			options.port = 80;
			}
			pg = http.get(options, function(res) {
			var buf = [];
			res.on('data', function(data) {
				if (data) {
				buf.push(data);
				}
			});
			res.on('close', function() {
				if (buf.length > 0) {
				return callback(null, buf.join(""), pathname);
				}
				else {
				return callback('Stream closed, No data returned', null, pathname);
				}
			});
			res.on('end', function() {
				if (buf.length > 0) {
				return callback(null, buf.join(""), pathname);
				}
				else {
				return callback('No data returned', null, pathname);
				}
			});
			res.on('error', function(err) {
				if (buf.length > 0) {
				return callback(err, buf.join(""), pathname);
				}
				else {
				return callback(err, null, pathname);
				}
			});
			}).on("error", function(err) {
			return callback(err, null, pathname);
			});
			break;
		case 'https:':
			if (parts.port === undefined) {
			options.port = 443;
			}
			pg = https.get(options, function(res) {
			var buf = [];
			res.on('data', function(data) {
				buf.push(data);
			});
			res.on('close', function() {
				if (buf.length > 0) {
				return callback(null, buf.join(""), pathname);
				}
				else {
				return callback('Stream closed, No data returned', null, pathname);
				}
			});
			res.on('end', function() {
				if (buf.length > 0) {
				return callback(null, buf.join(""), pathname);
				}
				else {
				return callback('No data returned', null, pathname);
				}
			});
			res.on('error', function(err) {
				if (buf.length > 0) {
				return callback(err, buf.join(""), pathname);
				}
				else {
				return callback(err, null, pathname);
				}
			});
			}).on("error", function(err) {
				return callback(err, null, pathname);
			});
			break;
		default:
			return callback("ERROR: unsupported protocol for " + pathname, null, pathname);
		}
	}
}; /* END: FetchPage() */


/**
 * Scrape - given a pathname (i.e. uri), 
 * an object of selectors (an object of key/selector strings),
 * and a callback scrape the content from the document.
 * cleaner and transform functions will be applied if supplied.
 * @param document_or_path - the path (local or url) to the document to be processed,
 * or HTML source code
 * @param selectors - an object with properties that are populated by  jQuery 
 * selectors.  (e.g. selectors = { title: 'title', body = '.main_content'}
 * would yeild an object with title and body properties based on the jQuery
 * selectors passed)
 * @param cleaner (optional) - a function to cleanup the document BEFORE
 * processing with jQuery. The cleaner is passed a string and returns a 
 * cleaned up string.
 * @param transformer (optional) - a function to transform the scraped
 * content (e.g. remove uninteresting markup. Transformer is called with 
 * the maps' key and the value returned by jQuery. It is expected to return
 * a transformed value as a string.
 */
Scrape = function(document_or_path, selectors, callback, cleaner, transformer) {
	if (typeof callback !== 'function') {
		throw ("callback is not a function");
	}
	if (typeof selectors !== 'object') {
		throw ("selectors is not an object");
	}
	if (typeof document_or_path !== 'string') {
		throw ("document or path is not a string");
	}

	var ScrapeIt = function(src, pname) {
		if (cleaner !== undefined) {
			src = cleaner(src);
		}
		try {
			jsdom.env({
				html: src,
				src : [ jquery ],
				done : function(err, window) {
					if (err) {
						return callback(err, null, pname);
					}
					var ky = "",
						output = {},
						val;
					for (ky in selectors) {
						val = window.jQuery(selectors[ky]).html();
						if (val) {
							if (transformer === undefined) {
								output[ky] = val;
							}
							else {
								output[ky] = transform(ky, val);
							}
						}
						else {
							output[ky] = '';
						}
					}
					return callback(null, output, pname);
				}
			});
		} catch (err) {
			return callback("DOM processing error: " + err, null, pname);
		}
	}; // END ScrapeIt()

	// If pathname is a path or URL then fetch a page, otherwise process
	// it as the HTML src.
	if (document_or_path.indexOf('<') > -1) {
		ScrapeIt(document_or_path);
	} else {
		FetchPage(document_or_path, function(err, html, pname) {
			if (err) {
				return callback(err, null, pname);
			} else {
				ScrapeIt(html, pname);
			}
		});
	}
}; /* END: Scrape() */

/**
 * Cleaner - default/example cleaner function.
 * @param html - the original html to clean
 * @return - cleaned html out
 */
Cleaner = function(html) {
	// NOTES: This RegExp is used to clear up some
	// nasty, probably Word, cut and paste.
	re65533 = new RegExp(String.fromCharCode(65533), "gm");
	// Perform some safe cleanup so jsDom can 
	// make a successful parse of things.
	// FIXME: This should be setup as a function that
	// can be replace as needed for specific scraping problems
	// may be call this cleanup()
	return html.toString().replace(/\r/gm, "").replace(/\s<\s/gm, ' &lt; ').replace(/\s>\s/gm, ' &gt; ').replace(/&#133;/gm, '...').replace(/&#145;/gm, "&#8216;").replace(/&#146;/gm, "&#8217;").replace(/&#147;/gm, '&#8220;').replace(/&#148;/gm, '&#8221;').replace(/&#150;/gm, '&#8211;').replace(/&#151;/gm, '&#8212;').replace(re65533, '');
}; /* END: Cleaner() */


/**
 * Transformer - an example transformer function (e.g. strip pesky font tags content tags)
 * @param ky - the property name you're transforming up (this is a convience field so
 * one function can process each property uniquely if necessary)
 * @param val - the value needing the trasnformation 
 * @return transformed markup
 */
Transformer = function(ky, val) {
	return val.replace(/<\/p>/mgi, '').replace(/<font\s+[\w|'|"|\s|=|,|\-]*>/igm, '').replace(/<\/font>/gmi, '').replace(/<spacer\s+[\w|'|"|\s|=|,|\-]*>/igm, '').replace(/<\/spacer>/gmi, '').replace(/<body>/gmi, '').replace(/<\/body>/gmi, '');
}; /* END: Transformer() */


exports.Cleaner = Cleaner;
exports.Transformer = Transformer;
exports.FetchPage = FetchPage;
exports.Scrape = Scrape;