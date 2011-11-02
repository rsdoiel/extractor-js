/**
 * extractor.js - A simple jsDom screen scraper utility library.
 * It's helpful where you need to scrape content via http/https or from
 * a mirrored copy on your file system.
 *
 * author: R. S. Doiel, <rsdoiel@gmail>
 *
 *
 * copyright (c) 2011 all rights reserved
 *
 * Released under New the BSD License.
 * See: http://opensource.org/licenses/bsd-license.php
 * 
 * revision 0.0.5
 */
var	url = require('url'),
	fs = require('fs'),
	path = require('path'),
	http = require('http'),
	https = require('https'),
	jsdom = require('jsdom');


/**
 * FetchPage - read a file from the local disc or via http/https
 * @param pathname - a disc path or url to the document you want to
 * read in and process with the callback.
 * @param callback - the callback you want to run when you have the file. The 
 * callback will be passed an error, data (buffer stream) and the path where it came from.
 * @param timeout - (optional, default 0) a maximum time before res.end() if greater then zero
 */
FetchPage = function(pathname, callback, timeout) {
	var pg, parts, options = { method:'GET' };
	// handle timeout
	if (timeout === undefined) {
		timeout = 0;
	}

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
}; /* END: FetchPage(pathname, callback, timeout) */


/**
 * Scrape - given a pathname (i.e. uri), 
 * an object of selectors (an object of key/selector strings),
 * and a callback scrape the content from the document.
 * cleaner and transform functions will be applied if supplied.
 * @param document_or_path - the path (local or url) to the document to be processed,
 * or HTML source code
 * @param selectors - an object with properties that are populated by querySelectorAll
 * (e.g. selectors = { title: 'title', body = '.main_content'}
 * would yeild an object with title and body properties based on the CSS
 * selectors passed)
 * @param options - can include 
 * 		+ cleaner - a function to cleanup the document BEFORE
 *		  processing with querySelectorAll. The cleaner is passed a string and returns a 
 * 		  cleaned up string.
 * 		+ transformer - a function to transform the scraped
 * 		  content (e.g. remove uninteresting markup. Transformer is called with 
 * 		  the maps' key and the value returned by querySelectorAll. It is expected to return
 * 		  a transformed value as a string.
 * 		+ features object -
 *		"features": {
 *			"FetchExternalResources": false,
 *			"ProcessExternalResources": false,
 *			"MutationEvents": false,
 *			"QuerySelector": ["2.0"]
 *		},
 *		+ src - JavaScript source to apply to page
 */
Scrape = function(document_or_path, selectors, callback, options) {
	if (typeof callback !== 'function') {
		throw ("callback is not a function");
	}
	if (typeof selectors !== 'object') {
		throw ("selectors is not an object");
	}
	if (typeof document_or_path !== 'string') {
		throw ("document or path is not a string");
	}

	var defaults = {
		"cleaner": null,
		"transformer": null,
		"features": {
			"FetchExternalResources": false,
			"ProcessExternalResources": false,
			"MutationEvents": false,
			"QuerySelector": ["2.0"]
		},
		"src": []
	};

	//temporary workaround, while function has not an "option" object parameter merged with defaults
	if (options === undefined) {
		options = defaults;
	} else {
		// probably a cleaner way to do this.
		if (options.cleaner === undefined) {
			options.cleaner = defaults.cleaner;
		}
		if (options.transformer === undefined) {
			options.transformer = defaults.transformer;
		}
		if (options.features === undefined) {
			options.features = defaults.features;
		}
		if (options.src === undefined) {
			options.src = defaults.src;
		}
	}

	/**
	 * Builds a simple object containing useful element attributes
	 * @param  {Object} elem NodeElement object
	 * @return {Object}
	 */
	var makeItem = function(elem) {
		var val = {};

		if (elem.attributes) {
			// Here's a list of possibly 
			// interesting attributes to extract.
			['name', 'value', 'type', 'id', 'class', 'content', 'title',
			'placeholder', 'contenteditable', 'checked', 'selected', 'href',
			'src', 'alt', 'style', 'method', 'action', 'rel', 'language',
			'lang'].forEach(function(attr_name) {
				if (elem.hasAttribute(attr_name) && elem.getAttribute(attr_name) !== '') {
					val[attr_name] = elem.getAttribute(attr_name);
				}
			});
		}

		if (elem.innerHTML) {
			val.innerHTML = elem.innerHTML;
		}
		if (elem.text) {
			if (typeof elem.text === 'string') {
				val.text = elem.text;
			} else {
				val.text = elem.text();
			}
		}

		return val;
	};// END: makeItem(elem)
    
	var ScrapeIt = function(src, pname) {
		if (typeof options.cleaner === 'function') {
			src = options.cleaner(src);
		}
		try {
			jsdom.env({
				html: src,
				src : options.src,
				features: options.features,
				done : function(err, window) {
					if (err) {
						return callback(err, null, pname);
					}
					
					var ky = "",
						output = {},
						val;
					for (ky in selectors) {
						val = window.document.querySelectorAll(selectors[ky]);

						if (val.length > 1) {
							output[ky] = [];
							Array.prototype.forEach.call(val, function(elem){
								output[ky].push(makeItem(elem));
							});
						} else if (val.length === 1) {
							output[ky] = makeItem(val[0]);
						}

						if (typeof options.transformer === 'function') {
							output[ky] = options.transformer(ky, output[ky]);
						}
					}
					return callback(null, output, pname);
				}
			});
		} catch (err) {
			return callback("DOM processing error: " + err, null, pname);
		}
	}; // END ScrapeIt(src, pname)

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
}; /* END: Scrape(document_or_path, selectors, callback, options) */


/**
 * Spider - extract anchors, images, links, and script urls from a page.
 * @param document_or_path
 * @param callback - callback for when you have all your scraped content
 * @param options - optional functions,settings to cleanup source before Scraping
 * @return object with assets property and links property
 */
Spider = function (document_or_path, callback, options) {
	var map = {anchors: 'a', images: 'img', scripts: 'script', links:'link' };
	Scrape(document_or_path, map, callback, options);
}; // END: Spider(document_or_path);

exports.FetchPage = FetchPage;
exports.Scrape = Scrape;
exports.Spider = Spider;