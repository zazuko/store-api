# store-api
![CI status](https://github.com/zazuko/store-api/workflows/Node.js%20CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/zazuko/store-api/badge.svg?branch=main)](https://coveralls.io/github/zazuko/store-api?branch=main)
[![npm version](https://badge.fury.io/js/store-api.svg)](https://www.npmjs.com/package/store-api)

A library making it easier to work with different triplestores by providing a unified interface for common admin and user actions.

Supported stores:

* [GraphDB][graphdb]
* [Fuseki][fuseki]
* [Stardog][stardog]

## Common Interface

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

async import (dbname, ntriples, graph)
```

## Usage

```js
import { Fuseki, GraphDB, Stardog } from 'store-api'

const dbname = 'test'

const db = new Fuseki({ user: '…', password: '…', endpoint: 'http://…' }) // or GraphDB or Stardog
await db.createDb(dbname)

await db.import(dbname, fs.readFileSync('./triples.nt'))

const count = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
const inserted = Number(count.results.bindings[0].tot.value)
console.log({ inserted })

await db.clearDb(dbname)
await db.dropDb(dbname)
```

## Store Specific

### User Management & Permissions

#### Fuseki

Not supported

#### GraphDB

Documentation: https://ontotext-ad.github.io/graphdb.js/GraphDBServerClient.html

```js
import { GraphDB } from 'store-api'

const db = new GraphDB({ user: '…', password: '…', endpoint: 'http://…' })

db.conn.getUser(username)
```

#### Stardog

Documentation: https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#user

```js
import { Stardog } from 'store-api'
import stardogLib from 'stardog'
const { user } = stardogLib

const db = new Stardog({ user: '…', password: '…', endpoint: 'http://…' })

user.get(db.conn, username, params)
```

[graphdb]: https://www.ontotext.com/products/graphdb/
[fuseki]: https://jena.apache.org/documentation/fuseki2/
[stardog]: https://www.stardog.com/
