ClusteredSpider
===============

# Overview

ClusteredSpider is designed as a high level object which can spider one or 
more websites and preserve its state across multiple invocations. It collects
what individual page results from extractor.Spider() maintain the a list of 
links contained in a specific page as well as a record of pages that are pointing
at the page spidered. It relies on the NodeJS's dirty module for persistance.  
It is suitable for creating custom a stand lone spiders with it. It doesn't support
robot.txt processing at this time.

# Example

Create a spider that will crawl http://example.com.

```javascript
    var util = require("util"),
        extractor = require('extractor'),
        ClusteredSpider = extractor.ClusteredSpider({ url: "http://example.com" });

    ClusteredSpider.on("message", function (m) {
      if (m.error) {
         console.error(m.messenger + ": " + m.error);
      }
      if (m.message) {
        console.log(m.messagenger + ": " + m.message);
      }
    });

    ClusteredSpider.on("data", function (m) {
        if (m.error) {
            console.error(m.messenger + ": " + m.error);
        }
        if (m.data) {
            console.log(util.inspect(m.data));
        }
    });
```
