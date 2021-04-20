import { Store } from './store.js'
import { chunkBetween } from './utils.js'
import fetch from 'node-fetch'

// https://jena.apache.org/documentation/fuseki2/fuseki-server-protocol.html
export class Fuseki extends Store {
  constructor (options = {}) {
    super()
    options = Object.assign({ user: 'admin', password: 'admin', endpoint: 'http://localhost:3030' }, options)

    this.url = options.endpoint
    this._headers = {
      Authorization: 'Basic ' + Buffer.from(`${options.user}:${options.password}`).toString('base64')
    }
  }

  // dbtype either 'tdb', 'tdb2' or 'mem'
  async createDb (dbname, options = {}) {
    options = Object.assign({ dbtype: 'tdb2' }, options)
    const response = await fetch(`${this.url}/$/datasets?state=active&dbType=${options.dbtype}&dbName=${dbname}`, {
      method: 'POST',
      headers: this._headers
    })

    if (!response.ok) {
      throw new Error(`Failed to create dataset ${dbname}`)
    }
    return true
  }

  async dropDb (dbname) {
    const response = await fetch(`${this.url}/$/datasets/${dbname}`, {
      method: 'DELETE',
      headers: this._headers
    })

    if (!response.ok) {
      throw new Error(`Failed to drop dataset ${dbname}`)
    }
    return true
  }

  async clearDb (dbname) {
    return this.update(dbname, 'DELETE {?s ?p ?o} WHERE {?s ?p ?o}')
  }

  async online (dbname) {
    const response = await fetch(`${this.url}/$/datasets/${dbname}?state=active`, {
      method: 'POST',
      headers: this._headers
    })
    if (!response.ok) {
      throw new Error(`Failed to put dataset ${dbname} online`)
    }
    this.log(`dbname ${dbname} is online`)
    return true
  }

  async offline (dbname) {
    const response = await fetch(`${this.url}/$/datasets/${dbname}?state=offline`, {
      method: 'POST',
      headers: this._headers
    })
    if (!response.ok) {
      throw new Error(`Failed to put dataset ${dbname} offline`)
    }
    this.log(`dbname ${dbname} is offline`)
    return true
  }

  async ask (dbname, sparql, options = {}) {
    return this._readQuery(dbname, sparql, options)
  }

  async construct (dbname, sparql, options = {}) {
    return this._readQuery(dbname, sparql, options)
  }

  async describe (dbname, sparql, options = {}) {
    return this._readQuery(dbname, sparql, options)
  }

  async select (dbname, sparql, options = {}) {
    return this._readQuery(dbname, sparql, options)
  }

  async update (dbname, sparql, options = {}) {
    options = Object.assign({
      headers: {
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      format: 'json'
    }, options)

    const body = {
      update: sparql
    }

    const response = await fetch(`${this.url}/${dbname}`, {
      method: 'POST',
      headers: { ...this._headers, ...options.headers },
      body: objectToBody(body)
    })
    if (!response.ok) {
      console.error(await response.text())
      throw new Error('Query failed')
    }
    return true
  }

  async import (dbname, ntriples, graph) {
    const mapper = graph
      ? (chunk) => `INSERT DATA { GRAPH <${graph}> { ${chunk} } }`
      : (chunk) => `INSERT DATA { ${chunk} }`

    const queries = chunkBetween(ntriples, mapper, 1_000)
    const results = await Promise.all(
      queries.map((query) => this.update(dbname, query))
    )
    return results.every(Boolean)
  }

  async _readQuery (dbname, sparql, options = {}) {
    options = Object.assign({
      headers: {
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      format: 'json'
    }, options)

    const body = {
      format: options.format,
      query: sparql
    }

    const response = await fetch(`${this.url}/${dbname}/sparql`, {
      method: 'POST',
      headers: { ...this._headers, ...options.headers },
      body: objectToBody(body)
    })
    if (!response.ok) {
      console.error(await response.text())
      throw new Error('Query failed')
    }
    return response.json()
  }
}

function objectToBody (obj) {
  return Object.entries(obj).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&')
}
