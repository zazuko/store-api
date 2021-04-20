import { chunkBetween } from './utils.js'
import { Store } from './store.js'
import libGraphDB from 'graphdb'
import isStream from 'is-stream'

const { GraphDBServerClient, ServerClientConfig } = libGraphDB.server
const { RDFMimeType, QueryContentType } = libGraphDB.http
const { RepositoryConfig, RepositoryType, RepositoryClientConfig } = libGraphDB.repository
const { GetQueryPayload, UpdateQueryPayload, QueryType } = libGraphDB.query

export class GraphDB extends Store {
  constructor (options = {}) {
    super()
    options = Object.assign({ endpoint: 'http://localhost:7200' }, options)

    this.url = options.endpoint
    const serverConfig = new ServerClientConfig(this.url)
      .setTimeout(5000)
      .setHeaders({
        Accept: RDFMimeType.SPARQL_RESULTS_JSON
      })
      .setKeepAlive(true)

    if (options.user && options.password) {
      serverConfig.useBasicAuthentication(options.user, options.password)
    }

    this._conn = new GraphDBServerClient(serverConfig)
    this._repos = {}
  }

  async createDb (dbname) {
    const config = new RepositoryConfig(dbname, '', new Map(), '', dbname, RepositoryType.FREE)
    await this.conn.createRepository(config)
    return true
  }

  async dropDb (dbname) {
    await this.conn.deleteRepository(dbname)
    return true
  }

  async clearDb (dbname, options = {}) {
    const repo = await this._getRepo(dbname, options)
    const res = await repo.deleteAllStatements()
    return res || true
  }

  async ask (dbname, sparql, options = {}) {
    options = Object.assign({ responseType: RDFMimeType.SPARQL_RESULTS_JSON }, options)
    return this._readQuery(dbname, sparql, QueryType.ASK, options)
  }

  async construct (dbname, sparql, options = {}) {
    options = Object.assign({ responseType: RDFMimeType.JSON_LD }, options)
    return this._readQuery(dbname, sparql, QueryType.CONSTRUCT, options)
  }

  async describe (dbname, sparql, options = {}) {
    options = Object.assign({ responseType: RDFMimeType.JSON_LD }, options)
    return this._readQuery(dbname, sparql, QueryType.DESCRIBE, options)
  }

  async select (dbname, sparql, options = {}) {
    options = Object.assign({ responseType: RDFMimeType.SPARQL_RESULTS_JSON }, options)
    return this._readQuery(dbname, sparql, QueryType.SELECT, options)
  }

  async update (dbname, sparql, options = {}) {
    const repo = await this._getRepo(dbname, options)

    const payload = new UpdateQueryPayload()
      .setQuery(sparql)
      .setContentType(QueryContentType.X_WWW_FORM_URLENCODED)
      .setInference(Boolean(options.inference))
      .setTimeout(options.timeout || 30_000)

    return repo.update(payload).then((res) => res || true)
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

    const repositoryClientConfig = new RepositoryClientConfig(this.url)
      .setEndpoints([`${this.url}/repositories/${dbname}`])
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
