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
	numCPUs = require('os').cpus().length, stat;

if (cluster.isMaster) {
	if (process.argv.length <= 2) {
		// If there is no spider.db then display USAGE
		try {
			stat = fs.statSync('spider.db');		
		} catch (err) {
			console.error("USAGE: node " + process.argv[1] + " STARTING_URL\n");
			process.exit(1);			
		}
		if (stat.isFile() !== true) {
			console.error("USAGE: node " + process.argv[1] + " STARTING_URL\n");
			process.exit(1);			
		}
	}
	db = dirty('spider.db');

	console.log("PARENT numCPUs: " + numCPUs);
	console.log("PARENT pid: " + process.pid);
	console.log("PARENT loading db ...");
	db.on('load', function() {
		var n = [], i, urls = [], cpids = [], count_down;
		// Seed the DB
		for (i = 2; i < process.argv.length; i++) {
			db.set(process.argv[i], { url: process.argv[i], processed: false });
		}
		
		// Fork and setup the children
		for (i = 0; i < numCPUs; i++ ) {
			n.push(cluster.fork());
			console.log("PARENT Forked child with pid: " + n[i].pid);

			n[i].on('message', function(m) {
				if (m.processed_url !== undefined &&
						m.found_urls !== undefined) {
					if (m.found_urls.join && m.found_urls.length > 0) {
						m.found_urls.forEach(function(work_url) {
							if (work_url.indexOf('://') < 0) {
								work_url = work_url.replace(/\:\//,'://');
							}
							row = db.get(work_url);
							if (row === undefined) {
								console.log("Discovered: " + work_url);
								db.set(work_url, { url: work_url, processed: false });
							}
						});
					}
					if (m.processed_url) {
						console.log("Processed: " + m.processed_url);
						db.set(m.processed_url, {url: m.processed_url, processed: true});
					}
				}
			});
		
			n[i].on('death', function (worker) {
				console.error("ERROR: worker died: " + worker.pid);
			});

			n[i].on('exit', function (err_no) {
				if (err_no) {
					console.log("worker " + n[i].pid + " exited with error no: " + err_no);
				}
			});
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
				if (val.processed) {
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
			if (val.processed) {
				processed += 1;
			} else {
				unprocessed += 1;
			}
			tot += 1;
		});
		console.log("Total: " + tot + ", processed: " + processed + ", unprocessed: " + unprocessed);
	});
} else {
	process.on('message', function(m) {
		console.log('CHILD (' + process.pid +  ') spidering:', m.url);
		extractor.Spider(m.url, function(err, data, cur_url, res) {
			var i, cut_pos, new_parts, new_url,
				urls = [], base_parts, base_path;
			
			base_parts = url.parse(cur_url);
			base_path = base_parts.path;
			cut_pos = base_path.length;
		
			if (err) {
				console.error("ERROR: " + cur_url + ': ' + err);
			} else if (data) {
				if (data.anchors !== undefined) {
					// Do we have an array of anchors or a string?
					if (data.anchors.join && data.anchors.length !== undefined) {
						for(i = 0; i < data.anchors.length; i += 1) {
							if (data.anchors[i].href !== undefined) {
								new_parts = url.parse(data.anchors[i].href);
								if (new_parts.host === base_parts.host) {
									if (path.extname(new_parts.pathname) === '') {
										urls.push(url.format(new_parts));
										new_parts.pathname = path.join(new_parts.pathname,'index.html');
									}
									new_url = url.format(new_parts);
									// Now add the discovered URL to the list if it is new.	
									urls.push(new_url);	
								}
							}
						}
					} else if (data.anchors.href !== undefined) {
						new_parts = url.parse(data.anchors.href);
						if (new_parts.host === base_parts.host) {
							if (path.extname(new_parts.pathname) === '') {
								urls.push(url.format(new_parts));
								new_parts.pathname = path.join(new_parts.pathname,'index.html');
							}
							// Now add the discovered URL to the list if it is new.
							new_url = url.format(new_parts);
							urls.push(new_url);
						}
					}
				}
			}
			// Send the URLs found to the master process
			process.send({processed_url: cur_url, found_urls: urls, statusCode: res.statusCode, headers: res.headers});
		}, {response:true});
	});	// End process.on("message", ...);
}