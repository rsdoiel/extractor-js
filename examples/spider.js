/**
 * spider.js: a re-startable clustered spider
 *
 * author: R. S. Doiel, <rsdoiel@gmail>
 *
 * copyright (c) 2011 all rights reserved
 *
 * Released under New the BSD License.
 * See: http://opensource.org/licenses/bsd-license.php
 * 
 */
var	util = require('util'),
	fs = require('fs'),
	url = require('url'),
	path = require('path'),
	opt = require('opt'),
	extractor = require('extractor'),
	dirty = require('dirty'), db, stat,
	cluster = require('cluster'), 
	Options = {
		startUrls: [], 
		databaseName: "spider.db", 
		restrictPath: false,
		numThreads: require('os').cpus().length
	},
	// Functions
	USAGE, 
	setDatabase, setStartURLs, setNumThreads, setRestrictPath,
	formatRecord, runMaster, runChild;

USAGE = function (msg, error_level) {
	var heading = "\n USAGE:\n\n\tnode " + path.basename(process.argv[1]) + " --urls=STARTING_URL\n\tnode " + path.basename(process.argv[1]) + "\n\n SYNOPSIS:\n\n\t Spider urls and build a data set of link relationships.",
		help = opt.help(), ky;

	if (error_level !== undefined) {
		console.error(heading);
		if (msg !== undefined) {
			console.error("\n ERROR MSG:\n\n \t" + msg + "\n");
		} else {
			console.error("ERROR: process exited with an error " + error_level);
		}
		process.exit(error_level);
	}
	console.log(heading + "\n\n OPTIONS:\n");
	for (ky in help) {
		console.log("\t" + ky + "\t\t" + help[ky]);
	}
	console.log("\n\n");
	if (msg !== undefined) {
		console.log(" " + msg + "\n");
	}
	process.exit(0);
};

setDatabase = function (param) {
	Options.databaseName = param;
};

setStartURLs = function (param) {
	if (param.indexOf(',')) {
		param.split(',').forEach(function (start_url) {
			Options.startUrls.push(start_url.trim());
		});
	} else {
		Options.startUrls.push(param.trim());
	}
};

setNumThreads = function (param) {
	if (param.match(/[0-9]+/)){
		Options.numThreads = param;
	}
};

setRestrictPath = function (param) {
	Options.restrictPath = param;
};


/**
 * formatRecord - generates and empty Record or merges
 * existing Records.
 * @param record - a JavaScript Object with  Spider properties
 * @param updates - an object with only the properties needing to be updated.
 * @returns a new Record
 */
formatRecord = function (record, updates) {
        var defaults = {
        	url:'', processed: false, 
        	found_urls : [], 
        	linked_from_urls: [], 
        	statusCode: null, 
        	headers: null 
        };

        if (record !== undefined) {
                Object.keys(record).forEach(function (ky) {
                        defaults[ky] = record[ky];
                });
        }
        if (updates !== undefined) {
                Object.keys(updates).forEach(function(ky) {
                        defaults[ky] = updates[ky];
                });
        }
        return defaults;
};


/**
 * runMaster
 * @param options
 */
runMaster = function(options) {
	var onMessageToChild, onDeathOfChild;

	onMessageToChild = function (m) {
		var rec, processed_parts, processed_url;
	
		if (m.url !== undefined) {
			if (m.url.indexOf('://') < 0 && m.url.indexOf(':/') > 0) {
				m.url = m.url.replace(/\:\//,'://');
			}
		}
	
		if (m.url !== undefined && m.found_urls !== undefined) {
			if (m.found_urls.join && m.found_urls.length > 0) {
				m.found_urls.forEach(function (work_url) {
					var row, work_parts;
	
					if (work_url.indexOf('://') < 0 && work_url.indexOf(':/') > 0) {
						work_url = work_url.replace(/\:\//,'://');
					}
	
					// Remove # from url safely.
					work_parts = url.parse(work_url);
					if (work_parts.hash) {
						delete work_parts.hash;
					}
	
					if (options.restrictPath !== false) {
						if (work_parts.pathname.indexOf(options.restrictPath) === 0) {
							work_url = url.format(work_parts);
						} else {
							work_url = false;
						}
					} else {
						work_url = url.format(work_parts);
					}
	
					if (work_url !== false) {
						row = db.get(work_url);
						if (row === undefined) {
							console.log("Discovered: " + work_url);
							db.set(work_url, formatRecord({ url: work_url}));
						}
					}
				});
			}
			if (m.url) {
				processed_parts = url.parse(m.url);
				if (processed_parts.hash) {
					delete processed_parts.hash;
				}
				processed_url = url.format(processed_parts);
	
				console.log("Processed: " + processed_url);
				rec = db.get(processed_url);
				if (rec === undefined) {
					rec = formatRecord({url: processed_url});
				} else {
					rec.processed = true;
					rec = formatRecord(rec);
				}
				db.set(processed_url, rec);
			}
		}
	};

	onDeathOfChild = function (worker) {
		console.error("ERROR: worker died: " + worker.pid);
	};

	db = dirty(options.databaseName);

	console.log("PARENT pid: " + process.pid);
	console.log("PARENT no. of threads: " + options.numThreads);
	console.log("PARENT loading " + options.databaseName + " ...");
	if (options.startUrls.length > 0) {
		console.log("PARENT starting url(s):\n\t" + options.startUrls.join("\n\t"));
	}

	db.on('load', function () {
		var n = [], i, count_down, interval_id;

		// Seed the DB
		options.startUrls.forEach(function (start_url) {
			var rec, start_parts;

			if (start_url.indexOf('://') < 0) {
				start_url = start_url.replace(/\:\//,'://');
			}
			start_parts = url.parse(start_url);
			if (start_parts.hash) {
				delete start_parts.hash;
			}
			start_url = url.format(start_parts);
			rec = db.get(start_url);
			if (rec) {
				rec.processed = false;
			} else {
				rec = formatRecord({url: start_url});
				rec.processed = false;
			}
			db.set(start_url, rec);
		});
		
		// Fork and setup the children
		if (options.numThreads < 2) {
			options.numThreads = 2;
		}

		for (i = 0; i < options.numThreads; i++ ) {
			n.push(cluster.fork());
			console.log("PARENT Forked child with pid: " + n[i].pid);
			n[i].on('message', onMessageToChild);
			n[i].on('death', onDeathOfChild);
		}

		i = 0;
		db.forEach(function (ky, val) {
			if (val.processed === false) {
				if (ky.indexOf('://') < 0) {
					ky = ky.replace(/\:\//,'://');
				}
				console.log("PARENT requesting: " + ky + " to be spidered by CHILD " + n[i].pid);
				// FIXME: replace with a commend record format
				n[i].send(formatRecord(val,{url:ky, processed:false}));
				return false;
			}
			i += 1;
			i = i % options.numThreads;
		});

		// Setup an service for sending message to child
		count_down = 3;
		interval_id = setInterval(function () {
			var i = 0, j = 0, k = 0;
			db.forEach(function (ky, val) {
				if (ky && val.processed) {
					k += 1;
				} else {
					if (i < options.numThreads) {
						if (ky.indexOf('://') < 0) {
							ky = ky.replace(/\:\//,'://');
						}
						console.log("PARENT requesting: " + ky + " to be spidered by CHILD " + n[i].pid);
						// FIXME: replace with a commend record format
						n[i].send(formatRecord(val,{url:ky}));
						i += 1;
					}
					j += 1;
				}
			});
			console.log(j + " records remaining.");
			console.log(k + " records processed.");
			console.log(options.numThreads + " threads.");
			if (j === 0) {
				if (count_down < 1) {
					for (i = 0; i < options.numThreads; i += 1) {
						console.log("CHILD (" + n[i].pid + ") shutting down. ");
						process.kill(n[i].pid, 'SIGHUP');
					}
					clearInterval(interval_id);
				} else {
					console.log((count_down * 10) + " seconds until shutdown.");
				}
				count_down -= 1;
			} else {
				count_down = 3;
			}
		}, 10000);
	});
	
	db.on('drain', function () {
		var tot = 0, processed = 0, unprocessed = 0;
		db.forEach(function (ky, val) {
			if (ky && val.processed) {
				processed += 1;
			} else {
				unprocessed += 1;
			}
			tot += 1;
		});
		console.log("Total: " + tot + ", processed: " + processed + ", unprocessed: " + unprocessed);
	});
};


/**
 * runChild
 * @param options
 */
runChild = function (options) {
	var processLink = function (base_parts, new_parts) {
		if (new_parts.protocol !== undefined &&
			new_parts.protocol.match(/javascript/i)) {
			return false;
		}
		if (new_parts.host === undefined ||
			new_parts.host === base_parts.host) {
			return url.resolve(url.format(base_parts), url.format(new_parts));
		}
		return false;
	};

	process.on('message', function (m) {
		console.log('CHILD (' + process.pid +  ') spidering:', m.url);
		extractor.Spider(m.url, function (err, data, cur_url, res) {
			var i, new_url, urls = [], base_parts, base_path;

			base_parts = url.parse(cur_url);
			base_path = base_parts.path;

			if (err) {
				console.error("ERROR: " + cur_url + ': ' + err);
			} else if (data) {
				if (data.anchors !== undefined) {
					// Do we have an array of anchors or a string?
					if (data.anchors.join && data.anchors.length !== undefined) {
						for(i = 0; i < data.anchors.length; i += 1) {
							if (data.anchors[i].href !== undefined) {
								new_url = processLink(base_parts, url.parse(data.anchors[i].href));
								if (new_url) {
									urls.push(new_url);
								}
							}
						}
					} else if (data.anchors.href !== undefined) {
						new_url = processLink(base_parts, url.parse(data.anchors.href));
						if (new_url) {
							urls.push(new_url);
						}
					}
				}
			}
			// Send the URLs found to the master process
			if (res) {
				// FIXME: replace with a commend record format
				process.send(formatRecord({url: cur_url, found_urls: urls, statusCode: res.statusCode, headers: res.headers}));
			} else {
				// FIXME: replace with a commend record format
				process.send(formatRecord({url: cur_url, found_urls: urls}));
			}
		}, {response:true});
	});	// End process.on("message", ...);
};


if (require.main === module) {
	if (cluster.isMaster) {
		opt.set(['-d', '--database'], setDatabase, "Set the database filename to ");
		opt.set(['-u', '--urls'], setStartURLs, "The starting url(s) to run the spider over.");
		opt.set(['-t', '--threads'], setNumThreads, "Set the number of threads used by spider. Default is the number of CPUs available. The minimum is two.");
		opt.set(['-r', '--restrict'], setRestrictPath, "Only spider for a specific path. E.g. -r /my/stuff would only spider folders that start with /my/stuff.");
		opt.set(['-h', '--help'], USAGE, "Help message");
		opt.parse(process.argv);

		if (process.argv.length <= 2) {
			// If there is no spider.db then display USAGE
			try {
				stat = fs.statSync(DatabaseName);
			} catch (err) {
				USAGE("Missing spider.db, must provide STARTING_URL.", 1);
			}
			if (stat.isFile() !== true) {
				USAGE("spider.db is not a file.", 1);
			}
		}
		runMaster(Options);
	} else {
		runChild(Options);
	}
} else {
	exports.formatRecord = formatRecord;
	exports.runMaster = runMaster;
	exports.runChild = runChild;
}