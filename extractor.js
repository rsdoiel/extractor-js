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
 * revision 0.1.0
 */

/*jslint devel: true, node: true, maxerr: 50, indent: 4,  vars: true, sloppy: true, stupid: false */

var	url = require('url'),
	fs = require('fs'),
	path = require('path'),
	http = require('follow-redirects').http,
	https = require('https'),
	querystring = require('querystring'),
	jsdom = require('jsdom').jsdom;




/**
 * fetchPage - read a file from the local disc or via http/https
 * @param pathname - a disc path or url to the document you want to
 * read in and process with the callback.
 * @param options - a set of properties to modify fetchPage behavior (e.g. optional.response  
 * defaults to false).
 * @param callback - the callback you want to run when you have the file. The 
 * callback will be passed an error, data (buffer stream), and environment (e.g. the path where it came from).
 */
var fetchPage = function (pathname, options, callback) {
	var defaults = { response: false, method: 'GET' }, pg, parts, protocol_method = http;

	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	// process options
	if (options === undefined) {
		options = defaults;
	} else {
		Object.keys(defaults).forEach(function (ky) {
			if (options[ky] === undefined) {
				options[ky] = defaults[ky];
			}
		});
	}

	// local func to handle passing back the data and run the callback
	var finishUp = function (err, buf, res) {
		var env = {};
		// Setup the environment to return to the callback
		env.pathname = pathname;
		env.options = options;

		if (options.response === true && res !== undefined) {
			env.response = res;
			if (res.headers['last-modified'] !== undefined) {
				env.modified = res.headers['last-modified'];
			}
		}
		if (buf === undefined || buf === null) {
			return callback(err, null, env);
		}
		return callback(null, buf, env);
	};


	// Are we looking at the file system or a remote URL?
	parts = url.parse(pathname);
	Object.keys(parts).forEach(function (ky) {
		options[ky] = parts[ky];
	});

	// fetchPage always uses a GET
	options.method = 'GET';

	// Process based on our expectations of where to read from.
	if (options.protocol === undefined || options.protocol === 'file:') {
		fs.readFile(path.normalize(options.pathname), function (err, data) {
			finishUp(err, data);
		});
	} else {

		switch (options.protocol) {
		case 'http:':
			protocol_method = http;
			break;
		case 'https:':
			protocol_method = https;
			break;
		default:
			finishUp("ERROR: unsupported protocol for " + pathname, null);
			break;
		}

		// Force encoding to binary in order to safely handle non-utf8 pages.
		options.encoding = 'binary';
		pg = protocol_method.get(options, function (res) {
			var buf = [];

			res.on('data', function (data) {
				if (data) {
					buf.push(data);
				}
			});
			res.on('close', function () {
				if (buf.length === 0) {
					finishUp('Stream closed, No data returned', null, res);
				} else {
					finishUp(null, buf.join(''), res);
				}
			});
			res.on('end', function () {
				if (buf.length === 0) {
					finishUp('No data returned', null, res);
				} else {
					finishUp(null, buf.join(''), res);
				}
			});
			res.on('error', function (err) {
				if (buf.length === 0) {
					finishUp(err, null, res);
				} else {
					finishUp(err, buf.join(''), res);
				}
			});
		}).on("error", function (err) {
			finishUp(err, null);
		});
	}
}; /* END: fetchPage(pathname, options, callback) */


/**
 * Scrape - given a pathname (i.e. uri), 
 *	an object of selectors (an object of key/selector strings),
 *	and a callback scrape the content from the document.
 *	cleaner and transform functions will be applied if supplied.
 * @param buf_or_path - a binary buffer of the document or the path (local or url) to the document to be processed,
 *	or HTML source code
 * @param selectors - an object with properties that are populated by querySelectorAll
 *	(e.g. selectors = { title: 'title', body = '.main_content'}
 *	would yield an object with title and body properties based on the CSS
 *	selectors passed)
 * @param options - can include 
 *		+ cleaner - a function to cleanup the document BEFORE
 *		  processing with querySelectorAll. The cleaner is passed a string and returns a 
 *		  cleaned up string.
 *		+ transformer - a function to transform the scraped
 *		  content (e.g. remove uninteresting markup)s. Transformer is called with 
 *		  the maps' key and the value returned by querySelectorAll. It is expected to return
 *		  a transformed value as an array of strings since it is passed an array of strings 
 *		  by the callback.
 *		+ response - if true, return the response object in callback otherwise omit
 *		+ features object to pass to jsdom -
 *			"features": {
 *				"FetchExternalResources": false,
 *				"ProcessExternalResources": false,
 *				"MutationEvents": false,
 *				"QuerySelector": ["2.0"]
 *			}
 *		+ src - JavaScript source to apply to page
 * @param callback - the callback function to process the results
 */
var scrape = function (buf_or_path, selectors, options, callback) {
	var env = {}, document_or_path;

	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	if (typeof callback !== 'function') {
		throw ("callback is not a function");
	}
	if (typeof selectors !== 'object') {
		throw ("selectors is not an object");
	}
	if (typeof document_or_path !== 'string') {
		document_or_path = buf_or_path.toString();
	}

	var defaults = {
		"cleaner": null, // cleaner takes a binary buffer and returns a string
		"transformer": null,
		"response" : true, // was false,
        // FIXME, adjust this to better support jsDom 2.10
		"features": {
			"FetchExternalResources": ['script', 'img', 'css', 'frame', 'link'], // was false
			"ProcessExternalResources": true, // was false
			"MutationEvents": false, // was false
			"QuerySelector": ["2.0"]
		},
		"src": []
	};

	//temporary workaround, while function has not an "option" object parameter merged with defaults
	if (options === undefined) {
		options = defaults;
	} else {
		// probably a cleaner way to do this.
		Object.keys(defaults).forEach(function (ky) {
			if (options[ky] === undefined) {
				options[ky] = defaults[ky];
			}
		});
	}

	// Setup env to pass to callback
	env.selectors = selectors;
	env.options = options;
	if (document_or_path.indexOf('<') < 0) {
		env.pathname = document_or_path;
	} else {
		env.pathname = null;
	}

	/**
	 * Builds a simple object containing useful element attributes
	 * @param  {Object} elem NodeElement object
	 * @return {Object}
	 */
	var makeItem = function (elem) {
		var val = {};

		if (elem.attributes) {
			// Here's a list of possibly 
			// interesting attributes to extract.
			[
				'name', 'value', 'type', 'id', 'class', 'content', 'title',
				'placeholder', 'contenteditable', 'checked', 'selected',
				'href', 'src', 'alt', 'style', 'method', 'action', 'rel',
				'language', 'lang'
			].forEach(function (attr_name) {
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

	// ScrapeIt takes a buffer and sends a buffer
	// to the cleaner or converts it to a string.
	// the cleaner function should take care of 
	// any cleanup or character encoding conversion.
	var scrapeIt = function (buf, env) {
		var src;

        if (typeof options.cleaner === 'function') {
			src = options.cleaner(buf);
		} else {
			src = buf.toString();
		}
		try {
			jsdom.env({
				html: src,
				src : options.src,
				features: options.features,
				done : function (err, window) {
					var output = {}, val;
					if (err) {
						return callback(err, null, env);
					}
					Object.keys(selectors).forEach(function (ky) {
						var elems = [];
						val = window.document.querySelectorAll(selectors[ky]);
						Array.prototype.forEach.call(val, function (elem) {
							elems.push(makeItem(elem));
						});
						if (typeof options.transformer === 'function') {
							// NOTICE: options[ky] is an array when passed
							// to the transformer. Probably a good idea to
							// return an array too though you could return
							// something else.
							elems = options.transformer(ky, elems);
						}

						if (elems.length > 0) {
							output[ky] = elems;
						}
					});

					window.close();
                    return callback(null, output, env);
				}
			});
		} catch (err) {
			return callback(err, null, env);
		}
	}; // END scrapeIt(src, env)

	// If pathname is a path or URL then fetch a page, otherwise process
	// it as the HTML src.
	if (document_or_path.indexOf('<') > -1) {
		scrapeIt(buf_or_path, env);
	} else {
		fetchPage(document_or_path, options, function (err, html, env) {
			if (err) {
				return callback(err, null, env);
			}
			scrapeIt(html, env);
		});
	}
}; /* END: Scrape(document_or_path, selectors, options, callback) */


/**
 * Spider - extract anchors, images, links, and script urls from a page.
 * @param document_or_path
 * @param options - optional functions,settings to cleanup source before Scraping
 * @param callback - callback for when you have all your scraped content
 * @return object with assets property and links property
 */
var spider = function (document_or_path, options, callback) {
	var map = { anchors: 'a', images: 'img', scripts: 'script', links: 'link' };
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}
	scrape(document_or_path, map, options, callback);
}; // END: Spider(document_or_path);

exports.fetchPage = fetchPage;
exports.scrape = scrape;
exports.spider = spider;

