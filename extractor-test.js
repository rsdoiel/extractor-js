/**
 * extractor-test.js - the tests cases for extractor.js
 *
 * author: R. S. Doiel, <rsdoiel@gmail>
 *
 * copyright (c) 2011 all rights reserved
 *
 * Released under New the BSD License.
 * See: http://opensource.org/licenses/bsd-license.php
 */

const TIMEOUT = 10;

var sys = require('sys'),
    assert = require('assert'),
    extractor = require('./extractor'),
    test_expected = 0,
    test_completed = 0,
    TESTS = {}, ky = '', output = [];

console.log("Starting [extractor-test.js] ... " + new Date());

display = function(msg) {
	if (msg === undefined) {
		while(msg = output.shift()) {
			console.log(msg);
		}
	} else {
		output.push(msg);
	}
};

// Test FetchPage()
TESTS.FetchPage = function() {
	extractor.FetchPage('./README.md', function (err, data, pname) {
	    assert.ok(! err, "Should not get an error for reading README.md from the application directory.");
	    assert.ok(data.toString().indexOf("# Overview"), "Should get a data buffer back from README.md");
	    assert.equal(pname, './README.md', "Should have pname set to README.md");
	    test_completed += 1;
	    display("Finished FetchPage tests (" + test_completed + "/" + test_expected + ")");
	});
	
	return 1;// One test in the batch
};

// Test Scrape()
TESTS.Scrape = function () {
	var doc = [
	    "<!DOCTYPE html>",
	    "<html>",
	    "<head>",
	    "<title>Test 1</title>",
	    "</head>",
	    "<body>",
	    "<h1>H1 of Test 1</h1>",
	    "</body>",
	    "</html>"
	    ].join("\n"),
	    map = {'title':'title','h1':'h1'};
	
	extractor.Scrape("./test-data/test-1.html", map, function (err, data, pname) {
	    assert.ok(! err, "Should  not get an error. " + err);
	    assert.equal(pname, "./test-data/test-1.html", "Should have pname set to 'source code'");
	    assert.ok(typeof data === 'object', "Should have a data object");
	    assert.equal(data.title, "Test 1", "Title should be 'Test 1': " + JSON.stringify(data));
	    assert.equal(data.h1, "H1 of Test 1", "h1 should be 'H1 of Test 1': " + JSON.stringify(data));
	    test_completed += 1;
	    display("Scrape test, completed processing (" + test_completed + "/" + test_expected + ") : " + pname);
	});

	extractor.Scrape(doc, map, function (err, data, pname) {
	    assert.ok(! err, "Should  not get an error. " + err);
	    assert.equal(pname, undefined, "Should have pname set to ''");
	    assert.ok(typeof data === 'object', "Should have a data object");
	    assert.equal(data.title, "Test 1", "Title should be 'Test 1': " + JSON.stringify(data));
	    assert.equal(data.h1, "H1 of Test 1", "h1 should be 'H1 of Test 1': " + JSON.stringify(data));
	    test_completed += 1;
	    display("Scrape test, completed processing (" + test_completed + "/" + test_expected + ") : markup");
	});
	return 2;// Two tests in this batch
};


// Run the tests and keep track of what passed
for (ky in TESTS) {
	if (typeof TESTS[ky] === 'function') {
		console.log("Starting " + ky + "() ...");
		test_expected += TESTS[ky]();
	}
}
var waiting = 0;
setInterval(function () {
	display();
	if (test_expected === test_completed) {
		console.log("Success! " + new Date());
		process.exit(0);
	}
	waiting += 1;
	if (waiting > TIMEOUT) {
		console.error("Failed, timed out for incomplete tests " + test_completed + "/" + test_expected + ". " + new Date());
		process.exit(1);
	}
}, 1000);
