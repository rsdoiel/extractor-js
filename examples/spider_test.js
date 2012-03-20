/**
 * spider_test.js - the tests cases for spider.js
 *
 * author: R. S. Doiel, <rsdoiel@gmail>
 *
 * copyright (c) 2011 all rights reserved
 *
 * Released under New the BSD License.
 * See: http://opensource.org/licenses/bsd-license.php
 *
 * revision 0.0.1
 */
var TIMEOUT = 10,
    util = require('util'),
    path = require('path'),
    url = require('url'),
    assert = require('assert'),
    dirty = require('dirty'),
    spider = require('./spider'),
    test_expected = 0,
    test_completed = 0,
    TESTS = {}, ky = '', output = [],
    display = function(msg) {
		if (msg === undefined) {
			msg = output.shift();
			while(msg) {
				console.log(msg);
				msg = output.shift();
			}
		} else {
			output.push(msg);
		}
    };

console.log("Starting [" + path.basename(process.argv[1]) + "] ... " + new Date());

TESTS.formatRecord = function () {
	var rec1, rec2, rec3;

	test_expected += 3;
	// Empty record
	rec1 = spider.formatRecord();
	assert.ok(rec1, "Should have a rec1");
	assert.equal(rec1.url,"", "rec1: Should have an empty url string.");
	assert.equal(rec1.processed, false, "rec1: Should have processed === false");
	assert.equal(rec1.found_urls.length, 0, "rec1: Should have zero found urls");
	assert.equal(rec1.linked_from_urls.length, 0, "rec1: Should have zero linked from urls");
	assert.equal(rec1.statusCode, null, "rec1: Status code should be null");
	assert.equal(rec1.header, null, "rec1: Header should be null");
	test_completed += 1;
	
	// Update fields in empty record
	rec2 = spider.formatRecord({url:"http://example.com", processed: false});
	assert.ok(rec2, "Should have a rec2");
	assert.equal(rec2.url,"http://example.com", "rec2: Should have an empty url string.");
	assert.equal(rec2.processed, false, "rec2: Should have processed === false");
	assert.equal(rec2.found_urls.length, 0, "rec2: Should have zero found urls");
	assert.equal(rec2.linked_from_urls.length, 0, "rec2: Should have zero linked from urls");
	assert.equal(rec2.statusCode, null, "rec2: Status code should be null");
	assert.equal(rec2.header, null, "rec2: Header should be null");
	test_completed += 1;

	// Update existing record
	rec2.processed = true;
	rec2.found_urls.push("http://example.com/one.html");
	rec2.found_urls.push("http://example.com/two.html");
	rec2.found_urls.push("http://example.com/three.html");
		
	rec3 = spider.formatRecord(rec1,rec2);
	assert.ok(rec3, "Should have a rec3");
	assert.equal(rec3.url,"http://example.com", "rec3: Should have an empty url string.");
	assert.equal(rec3.processed, true, "rec3: Should have processed === true");
	assert.equal(rec3.found_urls.length, 3, "rec3: Should have zero found urls");
	assert.equal(rec3.linked_from_urls.length, 0, "rec2: Should have zero linked from urls");
	assert.equal(rec3.statusCode, null, "rec3: Status code should be null");
	assert.equal(rec3.header, null, "rec3: Header should be null");
	test_completed += 1;
};

TESTS.Spider = function () {
	test_expected += 1;
	assert.fail("Spider(), tests not implemented for runMaster(),runChild().");
	test_completed += 0;
};

// Run the tests and keep track of what passed
for (ky in TESTS) {
	if (typeof TESTS[ky] === 'function') {
		console.log("Starting " + ky + "() ...");
		TESTS[ky]();
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
