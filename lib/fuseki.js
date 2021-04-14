import { Store } from './interface.js'
import { chunkBetween } from './utils.js'
import fetch from 'node-fetch'

// https://jena.apache.org/documentation/fuseki2/fuseki-server-protocol.html
export class Fuseki extends Store {
  constructor () {
    super()
    const [user, password] = ['admin', 'admin']
    this.url = 'http://localhost:3030/'
    this._headers = {
      Authorization: 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')
    }
  }

  // dbtype either 'tdb', 'tdb2' or 'mem'
  async createDb (dbname, options = {}) {
    options = Object.assign({ dbtype: 'tdb2' }, options)
    const response = await fetch(`${this.url}$/datasets?state=active&dbType=${options.dbtype}&dbName=${dbname}`, {
      method: 'POST',
      headers: this._headers
    })

    if (!response.ok) {
      throw new Error(`Failed to create dataset ${dbname}`)
    }
    return true
  }

  async dropDb (dbname) {
    const response = await fetch(`${this.url}$/datasets/${dbname}`, {
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
    const response = await fetch(`${this.url}$/datasets/${dbname}?state=active`, {
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
    const response = await fetch(`${this.url}$/datasets/${dbname}?state=offline`, {
      method: 'POST',
      headers: this._headers
    })
    if (!response.ok) {
      throw new Error(`Failed to put dataset ${dbname} offline`)
    }
    this.log(`dbname ${dbname} is offline`)
    return true
  }

  async select (dbname, sparql, options = {}) {
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

    const response = await fetch(`${this.url}${dbname}/sparql`, {
      method: 'POST',
      headers: { ...options.headers, ...this._headers },
      body: objectToBody(body)
    })
    if (!response.ok) {
      console.error(await response.text())
      throw new Error('Query failed')
    }
    return response.json()
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

    const response = await fetch(`${this.url}${dbname}`, {
      method: 'POST',
      headers: { ...options.headers, ...this._headers },
      body: objectToBody(body)
    })
    if (!response.ok) {
      console.error(await response.text())
      throw new Error('Query failed')
    }
    return true
  }

  async import (dbname, ntriples) {
    const mapper = (chunk) => `
    INSERT DATA {
      ${chunk}
    }`
    const queries = chunkBetween(ntriples, mapper, 1_000)
    const results = await Promise.all(
      queries.map((query) => this.update(dbname, query))
    )
    return results.every(Boolean)
  }
}

function objectToBody (obj) {
  return Object.entries(obj).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&')
}
