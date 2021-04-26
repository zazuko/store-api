import stardog from 'stardog'
import SparqlClient from 'sparql-http-client'
import { Store } from './store.js'
import { chunkBetween } from './utils.js'
const { Connection, db, query } = stardog

/**
 * Class to interact with a Stardog store
 *
 * @extends Store
 */
export class Stardog extends Store {
  /**
   * @param {Object} [options={}] Connection params
   * @param {string} [options.user=admin] Username
   * @param {string} [options.password=admin] Password
   * @param {string} [options.endpoint=http://localhost:5820] Endpoint
   */
  constructor (options = {}) {
    super()
    this.endpointParams = Object.assign({ user: 'admin', password: 'admin', endpoint: 'http://localhost:5820' }, options)

    this._conn = new Connection({
      username: this.endpointParams.user,
      password: this.endpointParams.password,
      endpoint: this.endpointParams.endpoint
    })
  }

  /**
   * Creates a database
   *
   * <https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbcreateconn-database-databaseoptions-options-params>
   *
   * @async
   * @param {string} dbname
   * @param {Object} [options]
   * @param {Object} [options.databaseOptions={}]
   * @param {Object} [options.options={}]
   * @param {Object} [options.params={}]
   */
  async createDb (dbname, options = {}) {
    options = Object.assign({ databaseOptions: {}, options: {}, params: {} }, options)

    return this._handleResult(
      db.create(this.conn, dbname, options.databaseOptions, options.options, options.params)
    )
  }

  /**
   * Deletes a database
   *
   * <https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbdropconn-database-params>
   *
   * @async
   * @param {string} dbname
   * @param {Object} [options]
   * @param {Object} [options.params={}]
   */
  async dropDb (dbname, options = {}) {
    options = Object.assign({ params: {} }, options)

    return this._handleResult(
      db.drop(this.conn, dbname, options.params)
    )
  }

  /**
   * Empties a database
   *
   * <https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbdropconn-database-params>
   *
   * @async
   * @param {string} dbname
   * @param {Object} [options]
   * @param {Object} [options.params={}]
   */
  async clearDb (dbname, options = {}) {
    options = Object.assign({ params: {} }, options)

    const tx = new Transaction(this.conn, dbname, options.params)
    await tx.add((transactionId) => db.clear(this.conn, dbname, transactionId, options.params))
    return this._handleResult(tx.execute())
  }

  /**
   * Brings an offline database back online so that it can accept connections.
   *
   * <https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbonlineconn-database-params>
   *
   * @async
   * @param {string} dbname
   * @param {Object} [options]
   * @param {Object} [options.params={}]
   */
  async online (dbname, options = {}) {
    options = Object.assign({ params: {} }, options)

    return this._handleResult(
      db.online(this.conn, dbname, options.params)
    )
  }

  /**
   * Brings an online database offline.
   *
   * <https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbofflineconn-database-params>
   *
   * @async
   * @param {string} dbname
   * @param {Object} [options]
   * @param {Object} [options.params={}]
   */
  async offline (dbname, options = {}) {
    options = Object.assign({ params: {} }, options)

    return this._handleResult(
      db.offline(this.conn, dbname, options.params)
    )
  }

  /**
   * Issues an ASK query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {Object} [options.options]
   * @param {string} [options.options.accept=application/json]
   * @param {string} [options.params={}]
   * @param {string} [options.additionalHandlers={}]
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
   * @param {Object} [options.options]
   * @param {string} [options.options.accept=application/json]
   * @param {string} [options.params={}]
   * @param {string} [options.additionalHandlers={}]
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
   * @param {Object} [options.options]
   * @param {string} [options.options.accept=application/json]
   * @param {string} [options.params={}]
   * @param {string} [options.additionalHandlers={}]
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
   * @param {Object} [options.options]
   * @param {string} [options.options.accept=application/json]
   * @param {string} [options.params={}]
   * @param {string} [options.additionalHandlers={}]
   */
  async select (dbname, sparql, options = {}) {
    return this._readQuery(dbname, sparql, options)
  }

  /**
   * Issues a SPARQL UPDATE query
   *
   * <https://github.com/stardog-union/stardog.js/#queryexecuteconn-database-query-accept-params-additionalhandlers>
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {Object} [options.options]
   * @param {string} [options.options.accept=application/json]
   * @param {string} [options.params={}]
   * @param {string} [options.additionalHandlers={}]
   */
  async update (dbname, sparql, options = {}) {
    return this._query(dbname, sparql, options)
  }

  /**
   * Issues many SPARQL queries in a transaction
   *
   * <https://github.com/stardog-union/stardog.js/#queryexecuteconn-database-query-accept-params-additionalhandlers>
   * @async
   * @param {string} dbname
   * @param {string[]} sparqlQueries queries
   * @param {Object} [options]
   * @param {Object} [options.options]
   * @param {string} [options.options.accept=application/json]
   * @param {string} [options.params={}]
   * @param {string} [options.additionalHandlers={}]
   */
  async queries (dbname, sparqlQueries, options = {}) {
    options = Object.assign({ options: { accept: 'application/json' }, params: {}, additionalHandlers: {} }, options)

    const tx = new Transaction(this.conn, dbname, options.params)

    for (let i = 0; i < sparqlQueries.length; i++) {
      const chunk = sparqlQueries[i]
      const result = await tx.add((transactionId) => query.executeInTransaction(this.conn, dbname, transactionId, chunk, options.options, options.params))
      if (!result.ok) {
        this.log(result.body)
        throw new Error(result.body.message)
      }
    }

    return this._handleResult(tx.execute())
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
    return this.queries(dbname, queries)
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
      updateUrl: `${this.endpointParams.endpoint}/${dbname}/update`,
      storeUrl: `${this.endpointParams.endpoint}/${dbname}`
    }, options)

    return new SparqlClient(options)
  }

  // https://github.com/stardog-union/stardog.js/#queryexecuteconn-database-query-accept-params-additionalhandlers
  async _readQuery (dbname, sparql, options = {}) {
    return this._query(dbname, sparql, options)
  }

  async _query (dbname, sparql, options = {}) {
    options = Object.assign({ options: { accept: 'application/json' }, params: {}, additionalHandlers: {} }, options)

    return this._handleResult(
      query.execute(this.conn, dbname, sparql, options.accept, options.params, options.additionalHandlers)
    )
  }

  async _handleResult (response) {
    const result = await response
    if (result.ok) {
      if (result.body?.message) {
        return result.body.message
      }

      if (typeof result.body !== 'undefined' && result.body !== null) {
        return result.body
      }

      return true
    }
    else {
      console.error(result)
    }
    return null
  }
}

class Transaction {
  constructor (conn, dbname, params) {
    this.conn = conn
    this.dbname = dbname
    this.params = params
  }

  async add (fn) {
    if (!this.tx) {
      await this.begin()
    }
    return fn(this.tx)
  }

  async execute () {
    const result = await db.transaction.commit(this.conn, this.dbname, this.tx, this.params)
    if (!result.ok) {
      console.warn('rolling back')
      await db.transaction.rollback(this.conn, this.dbname, this.tx, this.params)
    }
    return result
  }

  async begin () {
    const response = await db.transaction.begin(this.conn, this.dbname, this.params)
    this.tx = response.transactionId
  }
}
