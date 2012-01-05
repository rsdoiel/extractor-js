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
 * revision 0.0.7e
 */
var	url = require('url'),
	fs = require('fs'),
	path = require('path'),
	http = require('http'),
	https = require('https'),
	querystring = require('querystring'),
	jsdom = require('jsdom');

var	util = require('util');// DEBUG

/**
 * SubmitForm - send a get/post and pass the results to the callback.
 * @param action - the url hosting the form processor (e.g. 'http://example.com/form-processor.php')
 * @param form_data - the form field name/values to submit
 * @param callback - the callback to use when you get a response from the form submission. Args past
 * to the callback function are err, data and options.
 * @param options - a set of properties to modify SubmitForm behavior (e.g. options.method defaults to POST,
 * optional.timeout defaults to 30000 milliseconds).
 */
var SubmitForm = function (action, form_data, callback, options) {
	var defaults = { method:'POST', timeout:30000, protocol: "http:" }, 
		parts, req, timer_id, protocol_method = http;

	// Setup options
	if (options === undefined) {
		options = {};
	}
	Object.keys(defaults).forEach(function (ky) {
		if (options[ky] === undefined) {
			options[ky] = defaults[ky];
		}
	});
	
	if (options.method === 'GET') {
		parts = url.parse(action + "?" + querystring.encode(form_data));
	} else {
		parts = url.parse(action)
	}
	Object.keys(parts).forEach(function (ky) {
		options[ky] = parts[ky];
	});

	// Process form request
	if (options.protocol === 'http:') {
		protocol_method = http;
		if (options.port === undefined) {
			options.port = 80;
		}
	} else if (options.protocol === 'https:') {
		protocol_method = https;
		if (options.port === undefined) {
			options.port = 443;
		}
	} else {
		return callback("ERROR: protocol not supported", null, options);
	}

	req = protocol_method.request(options, function(res) {
		var buf = [];
		res.on('data', function(data) {
			if (data) {
				buf.push(data);
			}
		});
		res.on('close', function() {
			if (timer_id) { clearTimeout(timer_id); }
			if (buf.length > 0) {
				return callback(null, buf.join(""), options);
			}
			else {
				return callback('Stream closed, No data returned', null, options);
			}
		});
		res.on('end', function() {
			if (timer_id) { clearTimeout(timer_id); }
			if (buf.length > 0) {
				return callback(null, buf.join(""), options);
			}
			else {
				return callback('No data returned', null, options);
			}
		});
		res.on('error', function(err) {
			if (timer_id) { clearTimeout(timer_id); }
			if (buf.length > 0) {
				return callback(err, buf.join(""), options);
			}
			else {
				return callback(err, null, options);
			}
		});
	});
	req.on('error', function (err) {
		return callback(err, null, options);
	});

	// Send the POST content if needed 
	if (options.method === 'POST') {
		req.write(querystring.encode(form_data));
	}
	req.end();
		
	timer_id = setTimeout(function () {
		return callback("ERROR: timeout", null, options);
	}, options.timeout);
}; /* END SubmitForm(action, form_data, callback, options) */


/**
 * FetchPage - read a file from the local disc or via http/https
 * @param pathname - a disc path or url to the document you want to
 * read in and process with the callback.
 * @param callback - the callback you want to run when you have the file. The 
 * callback will be passed an error, data (buffer stream) and the path where it came from.
 * @param options - a set of properties to modify FetchPage behavior (e.g. optional.timeout  
 * defaults to 30000 milliseconds).
 */
var FetchPage = function(pathname, callback, options) {
	var defaults = { response: false, timeout: 30000, method: 'GET' }, 
		pg, parts, timer_id, protocol_method = http, finishUp;

	// handle timeout
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
	finishUp = function (err, buf, pathname, res) {
			if (timer_id) { clearTimeout(timer_id); }
			if (options.response) {
				// FIXME Need to handle buf if array or string
				if (buf === null) {
					return callback(err, null, pathname, res);
				} 
				else if (buf.join === undefined && buf.length > 0) {
					return callback(null, buf.toString(), pathname, res);
				}
				else if (buf.join && buf.length) {
					return callback(null, buf.join(""), pathname, res);
				}
				else {
					return callback(err, null, pathname, res);
				}
			} else {
				if (buf === null) {
					return callback(err, null, pathname);
				} 
				else if (buf.join === undefined && buf.length > 0) {
					return callback(null, buf.toString(), pathname);
				}
				else if (buf.join && buf.length) {
					return callback(null, buf.join(""), pathname);
				}
				else {
					return callback(err, null, pathname);
				}
			}
	};

	// Are we looking at the file system or a remote URL?
	parts = url.parse(pathname);
	Object.keys(parts).forEach(function(ky) {
		options[ky] = parts[ky];
	});
	//options.host = options.hostname;
	if (options.pathname === undefined) {
		options.path = '/';
	}

	// FetchPage always uses a GET
	options.method = 'GET';
	
	// Process based on our expectations of where to read from.
	if (options.protocol === undefined || options.prototcol === 'file:') {
		fs.readFile(path.normalize(options.pathname), function(err, data) {
			finishUp(err, data, pathname, null);
		});
	} else {
		switch (options.protocol) {
		case 'http:':
			protocol_method = http;
			
			if (options.port === undefined) {
				options.port = 80;
			}
			break;
		case 'https:':
			if (options.port === undefined) {
				options.port = 443;
			}
			break;
		default:
			finishUp("ERROR: unsupported protocol for " + pathname, null, pathname, null);
			break;
		}
		
		pg = protocol_method.get(options, function(res) {
			var buf = [];
			res.on('data', function(data) {
				if (data) {
					buf.push(data);
				}
			});
			res.on('close', function() {
				finishUp('Stream closed, No data returned', buf, pathname, res);
			});
			res.on('end', function() {
				finishUp('No data returned', buf, pathname, res);
			});
			res.on('error', function(err) {
				finshUp(res, err, buf, pathname);
			});
		}).on("error", function(err) {
			finishUp(err, null, pathname, null);
		});

		timer_id = setTimeout(function () {
			finishUp("ERROR: timeout " + pathname, null, pathname, null);
		}, options.timeout);
	}
}; /* END: FetchPage(pathname, callback, options) */


/**
 * Scrape - given a pathname (i.e. uri), 
 *	an object of selectors (an object of key/selector strings),
 *	and a callback scrape the content from the document.
 *	cleaner and transform functions will be applied if supplied.
 * @param document_or_path - the path (local or url) to the document to be processed,
 *	or HTML source code
 * @param selectors - an object with properties that are populated by querySelectorAll
 *	(e.g. selectors = { title: 'title', body = '.main_content'}
 *	would yeild an object with title and body properties based on the CSS
 *	selectors passed)
 * @param options - can include 
 *		+ cleaner - a function to cleanup the document BEFORE
 *		  processing with querySelectorAll. The cleaner is passed a string and returns a 
 *		  cleaned up string.
 *		+ transformer - a function to transform the scraped
 *		  content (e.g. remove uninteresting markup. Transformer is called with 
 *		  the maps' key and the value returned by querySelectorAll. It is expected to return
 *		  a transformed value as a string.
 *		+ response - if true, return the response object in callback otherwise omit
 *		+ features object to pass to jsdom -
 *			"features": {
 *				"FetchExternalResources": false,
 *				"ProcessExternalResources": false,
 *				"MutationEvents": false,
 *				"QuerySelector": ["2.0"]
 *			}
 *		+ src - JavaScript source to apply to page
 */
var Scrape = function(document_or_path, selectors, callback, options) {
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
		"response" : true,
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
		Object.keys(defaults).forEach(function(ky) {
			if (options[ky] === undefined) {
				options[ky] = defaults[ky];
			}
		});
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
					var ky = "", output = {}, val;
					if (err) {
						return callback(err, null, pname);
					}
					Object.keys(selectors).forEach(function (ky) {
						val = window.document.querySelectorAll(selectors[ky]);

						if (val.length > 1) {
							output[ky] = [];
							Array.prototype.forEach.call(val, function (elem) {
								output[ky].push(makeItem(elem));
							});
						} else if (val.length === 1) {
							output[ky] = makeItem(val[0]);
						}

						if (typeof options.transformer === 'function') {
							output[ky] = options.transformer(ky, output[ky]);
						}
					});

					window.close();
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
var Spider = function (document_or_path, callback, options) {
	var map = { anchors: 'a', images: 'img', scripts: 'script', links:'link' };
	Scrape(document_or_path, map, callback, options);
}; // END: Spider(document_or_path);

exports.SubmitForm = SubmitForm;
exports.FetchPage = FetchPage;
exports.Scrape = Scrape;
exports.Spider = Spider;
