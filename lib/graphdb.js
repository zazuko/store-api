import SparqlClient from 'sparql-http-client'
import libGraphDB from 'graphdb'
import isStream from 'is-stream'
import { chunkBetween } from './utils.js'
import { Store } from './store.js'

const { GraphDBServerClient, ServerClientConfig } = libGraphDB.server
const { RDFMimeType, QueryContentType } = libGraphDB.http
const { RepositoryConfig, RepositoryType, RepositoryClientConfig } = libGraphDB.repository
const { GetQueryPayload, UpdateQueryPayload, QueryType } = libGraphDB.query

/**
 * Class to interact with a GraphDB store
 *
 * @extends Store
 */
export class GraphDB extends Store {
  /**
   * @param {Object} [options={}] Connection params
   * @param {string} [options.user] Username
   * @param {string} [options.password] Password
   * @param {string} [options.endpoint=http://localhost:7200] Endpoint
   */
  constructor (options = {}) {
    super()
    this.endpointParams = Object.assign({ endpoint: 'http://localhost:7200' }, options)

    const serverConfig = new ServerClientConfig(this.endpointParams.endpoint)
      .setTimeout(5000)
      .setHeaders({
        Accept: RDFMimeType.SPARQL_RESULTS_JSON
      })
      .setKeepAlive(true)

    if (this.endpointParams.user && this.endpointParams.password) {
      serverConfig.useBasicAuthentication(this.endpointParams.user, this.endpointParams.password)
    }

    this._conn = new GraphDBServerClient(serverConfig)
    this._repos = {}
  }

  /**
   * Creates a database
   *
   * @async
   * @param {string} dbname
   */
  async createDb (dbname) {
    const config = new RepositoryConfig(dbname, '', new Map(), '', dbname, RepositoryType.FREE)
    await this.conn.createRepository(config)
    return true
  }

  /**
   * Deletes a database
   *
   * @async
   * @param {string} dbname
   */
  async dropDb (dbname) {
    await this.conn.deleteRepository(dbname)
    return true
  }

  /**
   * Empties a database
   *
   * @async
   * @param {string} dbname
   */
  async clearDb (dbname, options = {}) {
    const repo = await this._getRepo(dbname, options)
    const res = await repo.deleteAllStatements()
    return res || true
  }

  /**
   * Issues an ASK query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {string} [options.responseType=application/sparql-results+json]
   */
  async ask (dbname, sparql, options = {}) {
    options = Object.assign({ responseType: RDFMimeType.SPARQL_RESULTS_JSON }, options)
    return this._readQuery(dbname, sparql, QueryType.ASK, options)
  }

  /**
   * Issues a CONSTRUCT query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {string} [options.responseType=application/ld+json]
   */
  async construct (dbname, sparql, options = {}) {
    options = Object.assign({ responseType: RDFMimeType.JSON_LD }, options)
    return this._readQuery(dbname, sparql, QueryType.CONSTRUCT, options)
  }

  /**
   * Issues a DESCRIBE query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {string} [options.responseType=application/ld+json]
   */
  async describe (dbname, sparql, options = {}) {
    options = Object.assign({ responseType: RDFMimeType.JSON_LD }, options)
    return this._readQuery(dbname, sparql, QueryType.DESCRIBE, options)
  }

  /**
   * Issues a SELECT query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {string} [options.responseType=application/sparql-results+json]
   */
  async select (dbname, sparql, options = {}) {
    options = Object.assign({ responseType: RDFMimeType.SPARQL_RESULTS_JSON }, options)
    return this._readQuery(dbname, sparql, QueryType.SELECT, options)
  }

  /**
   * Issues a SPARQL UPDATE query
   *
   * @async
   * @param {string} dbname
   * @param {string} sparql query
   * @param {Object} [options]
   * @param {Object} [options.inference=false]
   * @param {string} [options.timeout=30_000]
   * @param {string} [options.responseType=application/sparql-results+json]
   */
  async update (dbname, sparql, options = {}) {
    options = Object.assign({ responseType: RDFMimeType.SPARQL_RESULTS_JSON }, options)
    const repo = await this._getRepo(dbname, options)

    const payload = new UpdateQueryPayload()
      .setQuery(sparql)
      .setContentType(QueryContentType.X_WWW_FORM_URLENCODED)
      .setInference(Boolean(options.inference))
      .setTimeout(options.timeout || 30_000)

    return repo.update(payload).then((res) => res || true)
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
      endpointUrl: `${this.endpointParams.endpoint}/repositories/${dbname}`,
      updateUrl: `${this.endpointParams.endpoint}/repositories/${dbname}/statements`,
      storeUrl: `${this.endpointParams.endpoint}/repositories/${dbname}/rdf-graphs/service`
    }, options)

    return new SparqlClient(options)
  }

  async _readQuery (dbname, sparql, type, options = {}) {
    const repo = await this._getRepo(dbname, options)
    const payload = new GetQueryPayload()
      .setQuery(sparql)
      .setQueryType(type)
      .setResponseType(options.responseType)

    return this._handleResults(await repo.query(payload))
  }

  async _getRepo (dbname, options) {
    options = Object.assign({ readTimeout: 30_000, writeTimeout: 30_000 }, options)

    const repositoryClientConfig = new RepositoryClientConfig(this.endpointParams.endpoint)
      .setEndpoints([`${this.endpointParams.endpoint}/repositories/${dbname}`])
      .setReadTimeout(options.readTimeout)
      .setWriteTimeout(options.writeTimeout)

    const repo = await this.conn.getRepository(dbname, repositoryClientConfig)

    ;['N3Parser', 'NQuadsParser', 'NTriplesParser', 'TriGParser', 'TurtleParser', 'JsonLDParser', 'RDFXmlParser', 'SparqlJsonResultParser', 'SparqlXmlResultParser'].forEach((parser) => {
      repo.registerParser(new libGraphDB.parser[parser]())
    })

    return repo
  }

  async _handleResults (result) {
    if (!isStream(result)) {
      return result
    }

    const results = []

    result.on('data', (bindings) => {
      results.push(bindings)
    })

    return new Promise((resolve) => {
      result.on('end', () => {
        resolve(results)
      })
    })
  }
}
