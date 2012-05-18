var extractor = require('../extractor');

var map = {title:'title', intro : '#introduction' };

extractor.scrape('http://nodejs.org', map, function(err, data, env) {
	if (err) {
		console.error("ERROR: " + err);
	}
	console.log("from -> "+ env.pathname);
	console.log("data -> " + JSON.stringify(data));
});
