# store-api
![CI status](https://github.com/zazuko/store-api/workflows/Node.js%20CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/zazuko/store-api/badge.svg?branch=main)](https://coveralls.io/github/zazuko/store-api?branch=main)
[![npm version](https://badge.fury.io/js/store-api.svg)](https://www.npmjs.com/package/store-api)

A library making it easier to work with different triplestores by providing a unified interface for common admin and user actions.

Supported stores:

* [GraphDB][graphdb]
* [Fuseki][fuseki]
* [Stardog][stardog]

## Documentation

* [GraphDB](https://zazuko.github.io/store-api/GraphDB.html)
* [Fuseki](https://zazuko.github.io/store-api/Fuseki.html)
* [Stardog](https://zazuko.github.io/store-api/Stardog.html)

## Common Interface

* `async createDb (dbname, options)`
  [GraphDB](https://zazuko.github.io/store-api/GraphDB.html#createDb), [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#createDb), [Stardog](https://zazuko.github.io/store-api/Stardog.html#createDb)
* `async dropDb (dbname, options)`
  [GraphDB](https://zazuko.github.io/store-api/GraphDB.html#dropDb), [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#dropDb), [Stardog](https://zazuko.github.io/store-api/Stardog.html#dropDb)
* `async clearDb (dbname, options)`
  [GraphDB](https://zazuko.github.io/store-api/GraphDB.html#clearDb), [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#clearDb), [Stardog](https://zazuko.github.io/store-api/Stardog.html#clearDb)
* `async online (dbname, options)`
  [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#online), [Stardog](https://zazuko.github.io/store-api/Stardog.html#online)
* `async offline (dbname, options)`
  [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#offline), [Stardog](https://zazuko.github.io/store-api/Stardog.html#offline)
* `async ask (dbname, sparql, options)`
  [GraphDB](https://zazuko.github.io/store-api/GraphDB.html#ask), [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#ask), [Stardog](https://zazuko.github.io/store-api/Stardog.html#ask)
* `async construct (dbname, sparql, options)`
  [GraphDB](https://zazuko.github.io/store-api/GraphDB.html#construct), [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#construct), [Stardog](https://zazuko.github.io/store-api/Stardog.html#construct)
* `async describe (dbname, sparql, options)`
  [GraphDB](https://zazuko.github.io/store-api/GraphDB.html#describe), [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#describe), [Stardog](https://zazuko.github.io/store-api/Stardog.html#describe)
* `async select (dbname, sparql, options)`
  [GraphDB](https://zazuko.github.io/store-api/GraphDB.html#select), [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#select), [Stardog](https://zazuko.github.io/store-api/Stardog.html#select)
* `async update (dbname, sparql, options)`
  [GraphDB](https://zazuko.github.io/store-api/GraphDB.html#update), [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#update), [Stardog](https://zazuko.github.io/store-api/Stardog.html#update)
* `async import (dbname, ntriples, graph)`
  [GraphDB](https://zazuko.github.io/store-api/GraphDB.html#import), [Fuseki](https://zazuko.github.io/store-api/Fuseki.html#import), [Stardog](https://zazuko.github.io/store-api/Stardog.html#import)

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

The [tests](./test) create, drop, clear DBs, import data and query data, they can also be used as usage reference.

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
