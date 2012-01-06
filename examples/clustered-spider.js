/**
 * cluster-spider: demo of a re-startable clustered spider
 *
 * author: R. S. Doiel, <rsdoiel@gmail>
 *
 * copyright (c) 2011 all rights reserved
 *
 * Released under New the BSD License.
 * See: http://opensource.org/licenses/bsd-license.php
 * 
 */
var util = require('util'),
	fs = require('fs'),
	url = require('url'),
	path = require('path'),
	opt = require('opt'),
	extractor = require('../extractor'),
	dirty = require('dirty'), db,
	cluster = require('cluster'),
	numCPUs = require('os').cpus().length, stat,
    START_URLS = [], restrictPath = false,
    // Functions
    USAGE, setStartURLs, setNumCPUs, setRestrictPath,
    onMessageToChild, onDeathOfChild;

USAGE = function (msg, error_level) {
    var heading = "\n USAGE: node " + process.argv[1] + " --urls=STARTING_URL\n\n SYNOPSIS: Spider urls and build a database of links.\n",
        help = opt.help(), ky;

    if (error_level !== undefined) {
        console.error(heading);
        if (msg !== undefined) {
            console.error(" " + msg + "\n");
        } else {
            console.error("ERROR: process exited with an error " + error_level);
        }
        process.exit(error_level);
    }
    console.log(heading + "\n\n OPTIONS\n");
    for (ky in help) {
        console.log("\t" + ky + "\t\t" + help[ky]);     
    }
    console.log("\n\n");
    if (msg !== undefined) {
	    console.log(" " + msg + "\n");
	}
    process.exit(0);
};

setStartURLs = function (param) {
    if (param.indexOf(',')) {
        param.split(',').forEach(function(start_url) {
            START_URLS.push(start_url.trim());
        });
    } else {
        START_URLS.push(param.trim());
    }
};

setNumCPUs = function (param) {
	if (param.match(/[0-9]+/)){
		numCPUs = param;
	}
};

setRestrictPath = function (param) {
	restrictPath = param;
};

onMessageToChild = function(m) {
	var work_parts, work_url;
	
    if (m.processed_url !== undefined && m.found_urls !== undefined) {
		if (m.found_urls.join && m.found_urls.length > 0) {
			m.found_urls.forEach(function(work_url) {
                var row;
                            
				if (work_url.indexOf('://') < 0) {
					work_url = work_url.replace(/\:\//,'://');
				}
				// Remove # from url safely.
				work_parts = url.parse(work_url);
				if (work_parts.hash) {
					delete work_parts.hash;
				}
				if (restrictPath !== false) {
					if (work_parts.pathname.indexOf(restrictPath) === 0) {
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
						db.set(work_url, { url: work_url, processed: false });
					}
				}
			});
		}
		if (m.processed_url) {
			work_parts = url.parse(m.processed_url);
			if (work_parts.hash) {
				delete work_parts.hash;
			}
			work_url = url.format(work_parts);		
			console.log("Processed: " + work_url);
			db.set(work_url, {url: work_url, processed: true});
		}
	}
};

onDeathOfChild = function (worker) {
    console.error("ERROR: worker died: " + worker.pid);
};

if (cluster.isMaster) {
    opt.set(['-u', '--urls'], setStartURLs, "The starting url(s) to run the spider over.");
    opt.set(['-t', '--thread-count'], setNumCPUs, "Set the number of threads used by spider. Default is the number of CPUs available.");
    opt.set(['-r', '--restrict-path'], setRestrictPath, "Only spider for a specific path. E.g. -r /my/stuff would only spider folders that start with /my/stuff.");
    opt.set(['-h', '--help'], USAGE, "Help message");
    opt.parse(process.argv);
    
	if (process.argv.length <= 2) {
		// If there is no spider.db then display USAGE
		try {
			stat = fs.statSync('spider.db');		
		} catch (err) {
			USAGE("Missing spider.db, must provide STARTING_URL.", 1);			
		}
		if (stat.isFile() !== true) {
			USAGE("spider.db is not a file.", 1);			
		}
	}
	db = dirty('spider.db');

	console.log("PARENT No. of threads: " + numCPUs);
	console.log("PARENT pid: " + process.pid);
	console.log("PARENT loading db ...");
	db.on('load', function() {
		var n = [], i, count_down, interval_id;

		// Seed the DB
		START_URLS.forEach(function(start_url) {
			db.set(start_url, { url: start_url, processed: false });
		});
		
		// Fork and setup the children
		for (i = 0; i < numCPUs; i++ ) {
			n.push(cluster.fork());
			console.log("PARENT Forked child with pid: " + n[i].pid);
			n[i].on('message', onMessageToChild);
			n[i].on('death', onDeathOfChild);
		}

		i = 0;
		db.forEach(function(ky, val) {
			if (val.processed === false) {
				if (ky.indexOf('://') < 0) {
					ky = ky.replace(/\:\//,'://');
				}
				console.log("PARENT requesting: " + ky + " to be spidered by CHILD " + n[i].pid);
				n[i].send({url:ky});
				return false;
			}
			i += 1;
			i = i % numCPUs;
		});


		// Setup an service for sending message to child
		count_down = 3;
		interval_id = setInterval(function() {
			var i = 0, j = 0, k = 0;
			db.forEach(function(ky, val) {
				if (ky && val.processed) {
					k += 1;
				} else {
					if (i < numCPUs) {
						if (ky.indexOf('://') < 0) {
							ky = ky.replace(/\:\//,'://');
						}
						console.log("PARENT requesting: " + ky + " to be spidered by CHILD " + n[i].pid);
						n[i].send({url:ky});
						i += 1;
					}
					j += 1;
				}
			});
			console.log(j + " records remaining.");
			console.log(k + " records processed.");
			console.log(numCPUs + " threads.");
			if (j === 0) {
				if (count_down < 1) {
					for (i = 0; i < numCPUs; i += 1) {
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
	
	db.on('drain', function() {
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
} else {
	var processLink = function (base_parts, new_parts) {
		if (new_parts.protocol !== undefined &&
			new_parts.protocol.match(/javascript/i)) {
			return false;
		}
		if (new_parts.host === base_parts.host) {
			if (path.extname(new_parts.pathname) === '') {
				//urls.push(url.format(new_parts));
				new_parts.pathname = path.join(new_parts.pathname,'index.html');
			}
			// Now add the discovered URL to the list if it is new.	
			return url.format(new_parts);
		} else if (new_parts.host === undefined) {
			// Process as relative link
			Object.keys(base_parts).forEach(function (ky) {
				// Skip properties that shouldn't carry over.
				if (["hash","search","query", "pathname"].indexOf(ky) < 0) {
					if (new_parts[ky] === undefined) {
						new_parts[ky] = base_parts[ky];
					}
				}
				if (new_parts.pathname && 
					new_parts.pathname.substr(0,1) !== "/") {
					if (path.extname(base_parts.pathname)) {
						new_parts.pathname = path.join(path.dirname(base_parts.pathname), new_parts.pathname);
					} else {
						new_parts.pathname = path.join(base_parts.pathname, new_parts.pathname);
					}
				} else if (base_parts.pathname && ! new_parts.pathname) {
					if (path.extname(base_parts.pathname)) {
						new_parts.pathname = path.dirname(base_parts.pathname);
					} else {
						new_parts.pathname = path.join(base_parts.pathname, "index.html");
					}
				}
			});
			if (new_parts.hash) {
				delete new_parts.hash;
			}
			return url.format(new_parts);
		}
		return false;
	};

	process.on('message', function(m) {
		console.log('CHILD (' + process.pid +  ') spidering:', m.url);
		extractor.Spider(m.url, function(err, data, cur_url, res) {
			var i, new_url,
				urls = [], base_parts, base_path;
			
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
				process.send({processed_url: cur_url, found_urls: urls, statusCode: res.statusCode, headers: res.headers});
			} else {
				process.send({processed_url: cur_url, found_urls: urls});
			}
		}, {response:true});
	});	// End process.on("message", ...);
}