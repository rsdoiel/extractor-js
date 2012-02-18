// Tests of SubmitForm()
TESTS.SubmitForm = function () {
	// http GET
	test_expected += 1;
	(function () {
		var hostname, pathname, uri, 
			uri_parts = url.parse("http://blog.nodejs.org/"), 
			uri = url.format(uri_parts), form_data, form_options = { method:'GET' };

		form_data = { s: 'npm' };
		display("Running SubmitForm test " + uri);
		extractor.SubmitForm(uri, form_data, form_options, function (err, data, env) {
			assert.ok(! err, uri + ": " + err);
			assert.ok(data, uri + " should get some data back.");
			assert.ok(data.match(/<\/html>/), uri + " should get the end of the html page response.");
			assert.equal(env.options.protocol, 'http:', uri + " should have an http: for protocol.");
			assert.equal(env.options.host, uri_parts.host, uri + "should have host " + uri_parts.host + ". " + util.inspect(env));
			assert.equal(env.options.method, 'GET', uri + " should have path GET " + util.inspect(env));
			assert.equal(env.options.timeout, 30000, uri + " should have 30000 for timeout. " + util.inspect(env));		
			test_completed += 1;
			display("SubmitForm " + uri + " completed processing (" + test_completed + "/" + test_expected + ")");
		});
	}());

	// https GET
	test_expected += 1;
	(function () {
		var hostname, pathname, uri, form_data, form_options = { method:'GET' };

		form_options = { method:'GET' };
		form_data = { q: 'extractor-js' };
		hostname = 'github.com';
		pathname = 'search';
		uri = url.format({ protocol: 'https', hostname: hostname, pathname: pathname});
		display("Running SubmitForm test " + uri);
		extractor.SubmitForm(uri, form_data, form_options, function (err, data, env) {
			var options = env.options;
			assert.ok(! err, uri + ": " + err);
			assert.ok(data, hostname + " should get some data back.");
			assert.ok(data.match(/<\/html>/), hostname + " should get the end of the html page response.");
			assert.equal(options.protocol, 'https:', hostname + " should have an http: for protocol.");
			assert.equal(options.host, hostname, hostname + " should have host github.com");
			assert.equal(options.port, 443, hostname + " should have port 443");
			assert.equal(options.path, ('/' + pathname + '?' + querystring.encode(form_data)), hostname + " should have path " + pathname + ": " + options.path);
			assert.equal(options.method, 'GET', hostname + " should have path GET");
			assert.equal(options.timeout, 30000, hostname + " should have 30000 for timeout.");		
			test_completed += 1;
			display("SubmitForm " + uri + " completed processing (" + test_completed + "/" + test_expected + ")");
		});
	}());
};
