FetchPage
=========
revision 0.0.5
--------------

# FetchPage(pathname, callback)

This is a method to simplify reading HTML documents from either local disc or via http/https connects. FetchPage() is used by Scrape() to retrieve HTML content if a URL or path is provided.


## parameters

* pathname - can be a local file path or a url with the http or https protocol.
* callback - this is a javascript function accepting three parameters - error, data, pathname. The error is an error object like those support by fs.readFile(). Data is a buffer streaming like thsoe passed by fs.readFile(). The last parameter, pathname, is the origin path or url requested. It is a convientance parameter used by extractor's Scrape() function.

# Examples

[ EXAMPLE SHOULD GO HERE ]
