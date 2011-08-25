var extractor = require('../extractor');

var map = {title:'title', links: 'a' };

extractor.Scrape('http://nodejs.org', map, function(err, data, url) {
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
