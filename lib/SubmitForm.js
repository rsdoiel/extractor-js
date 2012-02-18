/**
 * SubmitForm - send a get/post and pass the results to the callback.
 * @param action - the url hosting the form processor (e.g. 'http://example.com/form-processor.php')
 * @param form_data - the form field name/values to submit
 * @param options - a set of properties to modify SubmitForm behavior (e.g. options.method defaults to POST,
 * optional.timeout defaults to 30000 milliseconds).
 * @param callback - the callback to use when you get a response from the form submission. Args past
 * to the callback function are err, data and environment.
 */
var SubmitForm = function (action, form_data, options, callback) {
	var defaults = { method:'POST', timeout:30000, protocol: "http:" }, 
		parts, req, timer_id, protocol_method = http;

	if (typeof arguments[2] === 'function') {
		callback = arguments[2];
		options = {};
	}
	// Setup options
	if (options === undefined) {
		options = defaults;
	} else {
		Object.keys(defaults).forEach(function (ky) {
			if (options[ky] === undefined) {
				options[ky] = defaults[ky];
			}
		});
	}
	
	if (options.method === 'GET') {
		parts = url.parse(action + "?" + querystring.encode(form_data));
	} else {
		parts = url.parse(action);
	}
	Object.keys(parts).forEach(function (ky) {
		options[ky] = parts[ky];
	});

	// Process form request
	if (options.protocol === 'http:') {
		protocol_method = http;
	} else if (options.protocol === 'https:') {
		protocol_method = https;
	} else {
		return callback("ERROR: protocol not supported", null, {options:options});
	}

	req = protocol_method.request(options, function(res) {
		var buf = [], env = { options: options};
		if (options.response === true) {
			env.response = res;
		}
		res.on('data', function(data) {
			if (data) {
				buf.push(data);
			}
		});
		res.on('close', function() {
			if (timer_id) { clearTimeout(timer_id); }
			if (buf.length > 0) {
				return callback(null, buf.join(""), env);
			}
			else {
				return callback('Stream closed, No data returned', null, env);
			}
		});
		res.on('end', function() {
			if (timer_id) { clearTimeout(timer_id); }
			if (buf.length > 0) {
				return callback(null, buf.join(""), env);
			}
			else {
				return callback('No data returned', null, env);
			}
		});
		res.on('error', function(err) {
			if (timer_id) { clearTimeout(timer_id); }
			if (buf.length > 0) {
				return callback(err, buf.join(""), env);
			}
			else {
				return callback(err, null, env);
			}
		});
	});
	req.on('error', function (err) {
		return callback(err, null, {options: options});
	});

	// Send the POST content if needed 
	if (options.method === 'POST') {
		req.write(querystring.encode(form_data));
	}
	req.end();
		
	timer_id = setTimeout(function () {
		return callback("ERROR: timeout", null, {options: options});
	}, options.timeout);
}; /* END SubmitForm(action, form_data, options, callback) */

exports.SubmitForm = SubmitForm;
