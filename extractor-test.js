/**
 * extractor-test.js - the tests cases for extractor.js
 */
 
var sys = require('sys'),
    assert = require('assert'),
    extractor = require('./extractor');

console.log("Starting [extractor-test.js] ... " + new Date());
extractor.FetchPage('./README.md', function (err, data, pname) {
    assert.ok(! err, "Should not get an error for reading README.md from the application directory.");
    assert.ok(data.toString().indexOf("# Overview"), "Should get a data buffer back from README.md");
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
    assert.equal(pname, 'source code', "Should have pname set to 'source code'");
    assert.ok(typeof data === 'object', "Should have a data object");
    assert.equal(data.title, "Test 1", "Title should be 'Test 1': " + sys.inspect(data));
    assert.equal(data.h1, "H! of Test 1", "h1 should be 'H1 of Test 1': " + sys.inspect(data));    
});
console.log("Success! " + new Date());

