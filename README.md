# store-api
![CI status](https://github.com/zazuko/store-api/workflows/Node.js%20CI/badge.svg)
<!--[![Coverage Status](https://coveralls.io/repos/github/zazuko/store-api/badge.svg?branch=main)](https://coveralls.io/github/zazuko/store-api?branch=main)
[![npm version](https://badge.fury.io/js/store-api.svg)](https://www.npmjs.com/package/store-api)-->

A library making it easier to work with different triplestores by providing a unified interface for common admin and user actions.

Supported stores:

* [GraphDB][graphdb]
* [Fuseki][fuseki]
* [Stardog][stardog]

Common interface:

```
async createDb (dbname, options)

async dropDb (dbname, options)

async clearDb (dbname, options)

async online (dbname, options)

async offline (dbname, options)

async ask (dbname, sparql, options)

async construct (dbname, sparql, options)

async describe (dbname, sparql, options)

async select (dbname, sparql, options)

async update (dbname, sparql, options)

async import (dbname, ntriples)
```

[graphdb]: https://www.ontotext.com/products/graphdb/
[fuseki]: https://jena.apache.org/documentation/fuseki2/
[stardog]: https://www.stardog.com/
