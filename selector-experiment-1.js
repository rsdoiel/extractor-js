var	sys = require('sys'),
	fs = require('fs'),
	jsdom = require('jsdom'),
	assert = require('assert'),
	t2 = "#article",
	html2 = fs.readFileSync("test-data/test-2.html");

selectorTokenize = function (selector) {
	var i = 0, tokens = [], words = String(selector.replace(/\./gm,' .').replace(/#/gm,' #').replace(/>/gm,' > ')).trim().split(/\s/gm);

	console.log("words: " + sys.inspect(words));

	for (i = 0; i < words.length; i += 1) {
		switch(words[i].trim().substr(0,1)) {
		        case '>':
		        	tokens.push({ label:'>', op:'>'});
				break;
			case '.':
				tokens.push({label: words[i].substr(1), op: 'getElementByClassName'});
				break;
			case '#':
				tokens.push({label: words[i].substr(1), op: 'getElementById'});
				break;
			default:
				tokens.push({label: words[i].trim(), op: 'getElementByTagName'});
				break;
		}
	}
	return tokens;
};

queryByToken = function (doc, tok) {
	console.log("Token.op: [" + tok.op + "]");
	console.log("Token.label: [" + tok.label + "]");
	return doc[tok.op](tok.label);
};

tokens = selectorTokenize(t2);
console.log("Tokens: " + sys.inspect(tokens));

jsdom.env({ 
	html: html2,
	done: function (error, window) {
		var i, elem1, elem2, tok = tokens.shift();
		elem1 = queryByToken(window.document, tok);
		elem2 = window.document.getElementById('article');
		console.log("DEBUG: " + elem1.toString());
		console.log("DEBUG: " + sys.inspect(elem2));
	}
});

