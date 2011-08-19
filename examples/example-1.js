var extractor = require('../extractor');

var map = {title:'title', intro : '#introduction' };

extractor.Scrape('http://nodejs.org', map, function(err, data, url) {
	if (err) {
		console.error("ERROR: " + err);
	}
	console.log("from -> "+ url);
	console.log("data -> " + JSON.stringify(data));
});
