import fetch from 'node-fetch'
import SparqlClient from 'sparql-http-client'
import { Store } from './store.js'
import { chunkBetween } from './utils.js'

/**
 * Class to interact with a Fuseki store
 *
 * <https://jena.apache.org/documentation/fuseki2/fuseki-server-protocol.html>
 * @extends Store
 */
export class Fuseki extends Store {
  /**
   * @param {Object} [options={}] Connection params
   * @param {string} [options.user=admin] Username
   * @param {string} [options.password=admin] Password
   * @param {string} [options.endpoint=http://localhost:3030] Endpoint
   */
  constructor (options = {}) {
    super()
    this.endpointParams = Object.assign({ user: 'admin', password: 'admin', endpoint: 'http://localhost:3030' }, options)

    this.url = this.endpointParams.endpoint
    this._headers = {
      Authorization: 'Basic ' + Buffer.from(`${this.endpointParams.user}:${this.endpointParams.password}`).toString('base64')
    }
  }

  /**
   * Creates a database
   *
   * @async
   * @param {string} dbname
   * @param {Object} [options]
   * @param {string} [options.dbtype=tdb2] 'tdb', 'tdb2', or 'mem'
   */
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

  /**
   * Deletes a database.
   *
   * @async
   * @param {string} dbname
   */
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

  /**
   * Empties a database.
   *
   * @async
   * @param {string} dbname
   */
  async clearDb (dbname) {
    return this.update(dbname, 'DELETE {?s ?p ?o} WHERE {?s ?p ?o}')
  }

  /**
   * Brings an offline database back online so that it can accept connections.
   *
   * @async
   * @param {string} dbname
   */
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

  /**
   * Brings an online database offline.
   *
   * @async
   * @param {string} dbname
   */
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

  /**
   * Issues an ASK query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {Object} [options.headers] HTTP headers
   * @param {string} [options.headers.Accept=application/sparql-results+json]
   * @param {string} [options.headers.Content-Type=application/x-www-form-urlencoded; charset=UTF-8]
   * @param {string} [options.format=json]
   */
  async ask (dbname, sparql, options = {}) {
    return this._readQuery(dbname, sparql, options)
  }

  /**
   * Issues a CONSTRUCT query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {Object} [options.headers] HTTP headers
   * @param {string} [options.headers.Accept=application/sparql-results+json]
   * @param {string} [options.headers.Content-Type=application/x-www-form-urlencoded; charset=UTF-8]
   * @param {string} [options.format=json]
   */
  async construct (dbname, sparql, options = {}) {
    return this._readQuery(dbname, sparql, options)
  }

  /**
   * Issues a DESCRIBE query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {Object} [options.headers] HTTP headers
   * @param {string} [options.headers.Accept=application/sparql-results+json]
   * @param {string} [options.headers.Content-Type=application/x-www-form-urlencoded; charset=UTF-8]
   * @param {string} [options.format=json]
   */
  async describe (dbname, sparql, options = {}) {
    return this._readQuery(dbname, sparql, options)
  }

  /**
   * Issues a SELECT query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {Object} [options.headers] HTTP headers
   * @param {string} [options.headers.Accept=application/sparql-results+json]
   * @param {string} [options.headers.Content-Type=application/x-www-form-urlencoded; charset=UTF-8]
   * @param {string} [options.format=json]
   */
  async select (dbname, sparql, options = {}) {
    return this._readQuery(dbname, sparql, options)
  }

  /**
   * Issues a SPARQL UPDATE query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {Object} [options.headers] HTTP headers
   * @param {string} [options.headers.Accept=application/sparql-results+json]
   * @param {string} [options.headers.Content-Type=application/x-www-form-urlencoded; charset=UTF-8]
   * @param {string} [options.format=json]
   */
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

  /**
   * Loads triples or quads into a database
   *
   * @async
   * @param {string} dbname
   * @param {string|Buffer} ntriples triples or quads
   * @param {string=} graph named graph to insert to, defaults to default graph
   */
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

  /**
   * Creates a [SPARQL HTTP Client](https://zazuko.github.io/sparql-http-client/) for a database
   *
   * @param {string} dbname
   * @param {Object} options
   * @param {HeadersInit} [options.headers] HTTP headers to send with every endpoint request
   * @param {string} [options.user=username set when instantiating the store] user used for basic authentication
   * @param {string} [options.password=password set when instantiating the store] password used for basic authentication
   * @param {string} [options.endpointUrl=URL generated based on the store endpoint] SPARQL Query endpoint URL
   * @param {string} [options.updateUrl=URL generated based on the store endpoint] SPARQL Update endpoint URL
   * @param {string} [options.storeUrl] Graph Store URL
   * @param {fetch} [options.fetch=nodeify-fetch] fetch implementation
   * @param {factory} [options.factory=uses @rdfjs/data-model by default] RDF/JS DataFactory
   * @returns {SparqlHttpClient}
   */
  sparqlClientFor (dbname, options) {
    options = Object.assign({
      user: this.endpointParams.user,
      password: this.endpointParams.password,
      endpointUrl: `${this.endpointParams.endpoint}/${dbname}/query`,
      updateUrl: `${this.endpointParams.endpoint}/${dbname}/update`
    }, options)

    return new SparqlClient(options)
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
