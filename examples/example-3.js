//
// example-3.js - Proof of concept of a clustered implemented spider
//

var path = require('path'),
	extractor = require('extractor'),
	db = require('dirty')('spider.db'),
	cluster = require('cluster'),
	numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
	if (process.argv.length <= 2) {
		console.error("USAGE: node " + process.argv[1] + " STARTING_URL");
		process.exit(1);
	}

	console.log("PARENT numCPUs: " + numCPUs);
	console.log("PARENT pid: " + process.pid);
	console.log("PARENT loading db ...");
	db.on('load', function() {
		var n = [], i, process_page = function(m) {
                var row;
                if (m.processed_url !== undefined &&
						m.found_urls !== undefined) {
					if (m.found_urls && m.found_urls.length > 0) {
						m.found_urls.forEach(function(url) {
							row = db.get(url);
							if (row === undefined) {
								console.log("Discovered: " + url);
								db.set(url, { url: url, processed: false });
							}
						});
					}
					if (m.processed_url) {
						console.log("Processed: " + m.processed_url);
						db.set(m.processed_url, {url: m.processed_url, processed: true});
					}
				}
			},
            worker_died =  function (worker) {
                console.error("ERROR: worker died: " + worker.pid);
			},
            worker_exited = function (err_no) {
                console.log("worker " + n[i].pid + " exited: " + err_no);
            },
            message_parent = function(ky, val) {
                if (val.processed === false) {
					console.log("PARENT sending url: " + ky + " to be processed by " + n[i].pid);
					n[i].send({url:ky});
					return false;
				}
			};

		// Seed the DB
		for (i = 2; i < process.argv.length; i++) {
			db.set(process.argv[i], { url: process.argv[i], processed: false });
		}
		
		// Fork the children
		for (i = 0; i < numCPUs; i++ ) {
			n.push(cluster.fork());
			console.log("PARENT Forked child with pid: " + n[i].pid);

			n[i].on('message', process_page);
		
			n[i].on('death', worker_died);

			n[i].on('exit', worker_exited);
			
			db.forEach(message_parent);
		}


		// Setup an service for sending message to child
		setInterval(function() { 
			var i = 0, j = 0, k = 0;
			db.forEach(function(ky, val) {
				if (val.processed) {
					k += 1;
				} else {
					if (i < numCPUs) {
						console.log("PARENT requesting spider: " + ky + " by " + n[i].pid);
						n[i].send({url:ky});
						i += 1;
					}
					j += 1;
				}
			});
			console.log(j + " records remaining.");
			console.log(k + " records processed.");
			console.log(numCPUs + " threads.");
		}, 10000);
	});
	
	db.on('drain', function() {
		var processed = 0, unprocessed = 0;
		db.forEach(function (ky, val) {
			if (val.processed) {
				processed += 1;
			} else {
				unprocessed += 1;
			}
		});
		console.log("Total processed: " + processed + ", unprocessed: " + unprocessed);
	});
} else { // End of Parent process
	process.on('message', function(m) {
		console.log('CHILD ' + process.pid +  ' spider:', m.url);
		extractor.Spider(m.url, function(err, data, url) {
			var i, base_path = path.dirname(url), cut_pos = base_path.length, new_url,
				urls = [];
		
			if (err) {
				console.error("ERROR: " + url + ': ' + err);
			} else if (data) {
				if (data.anchors !== undefined) {
					if (data.anchors.length !== undefined) {
						for(i = 0; i < data.anchors.length; i += 1) {
							if (data.anchors[i].href !== undefined &&
								data.anchors[i].href.substr(0,cut_pos) === base_path) {
								new_url = data.anchors[i].href.trim();
								if (path.extname(new_url) === '') {
									new_url = path.join(new_url,'index.html');
								}
								// Now add the discovered URL to the list if it is new.	
								urls.push(new_url);	
							}
						}
					} else {
						if (data.anchors.href !== undefined &&
							data.anchors.href.substr(0,cut_pos) === base_path) {
							new_url = data.anchors.href.trim();
							if (path.extname(new_url) === '') {
								new_url = path.join(new_url,'index.html');
							}
							// Now add the discovered URL to the list if it is new.
							urls.push(new_url);
						}
					}
				}
			}
			//console.log("DEBUG found_urls: " + util.inspect(urls));
			// Send the URLs found to the master process
			process.send({processed_url: url, found_urls: urls});
		});
	});	// End process.on("message", ...);
} // End of child process 