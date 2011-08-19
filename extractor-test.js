/**
 * extractor-test.js - the tests cases for extractor.js
 */
 
var sys = requre('sys'),
    assert = require('assert'),
    extractor = require('./extractor');

extractor.FetchPage('./README.md', function (err, data, pname) {
    assert.ok(! err, "Should not get an error for reading README.md from the application directory.");
    assert.ok(data.indexOf("# Overview"), "Should get a data buffer back from README.md");
    assert.equal(pname, './README.md', "Should have pname set to README.md");
});


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

extractor.Scrape(doc, map, function (err, data, pname) {
    assert.ok(! err, "Should  not get an error. " + err);
    assert.ok(typeof data === 'object', "Should have a data object");
    assert.equal(pname, 'source code', "Should have pname set to 'source code'");
});

