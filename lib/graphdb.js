import { chunkBetween } from './utils.js'
import { Store } from './interface.js'
import libGraphDB from 'graphdb'

const { GraphDBServerClient, ServerClientConfig } = libGraphDB.server
const { RDFMimeType, QueryContentType } = libGraphDB.http
const { RepositoryConfig, RepositoryType, RepositoryClientConfig } = libGraphDB.repository
const { GetQueryPayload, UpdateQueryPayload, QueryType } = libGraphDB.query
const { SparqlJsonResultParser } = libGraphDB.parser

// console.log(libGraphDB)

export class GraphDB extends Store {
  constructor () {
    super()
    // const [user, password] = ['admin', 'admin']
    this.url = 'http://localhost:7200'

    const serverConfig = new ServerClientConfig(this.url)
      .setTimeout(5000)
      .setHeaders({
        Accept: RDFMimeType.SPARQL_RESULTS_JSON
      })
      .setKeepAlive(true)

    // if (user && password) {
    //   serverConfig.useBasicAuthentication('admin', 'root');
    // }

    this._conn = new GraphDBServerClient(serverConfig)
    this._repos = {}
  }

  async createDb (dbname) {
    const config = new RepositoryConfig(dbname, '', new Map(), '', dbname, RepositoryType.FREE)
    await this._conn.createRepository(config)
    return true
  }

  async dropDb (dbname) {
    await this._conn.deleteRepository(dbname)
    return true
  }

  async clearDb (dbname) {
    const repo = await this._getRepo(dbname)
    const res = await repo.deleteAllStatements()
    return res || true
  }

  async select (dbname, sparql) {
    const repo = await this._getRepo(dbname)
    const payload = new GetQueryPayload()
      .setQuery(sparql)
      .setQueryType(QueryType.SELECT)
      .setResponseType(RDFMimeType.SPARQL_RESULTS_JSON)

    return this._handleResults(await repo.query(payload))
  }

  async update (dbname, sparql, options = {}) {
    const repo = await this._getRepo(dbname)

    const payload = new UpdateQueryPayload()
      .setQuery(sparql)
      .setContentType(QueryContentType.X_WWW_FORM_URLENCODED)
      .setInference(Boolean(options.inference))
      .setTimeout(options.timeout || 30_000)

    return repo.update(payload).then((res) => res || true)
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

  async _getRepo (dbname) {
    if (this._repos[dbname]) {
      return this._repos[dbname]
    }

    const repositoryClientConfig = new RepositoryClientConfig(this.url)
      .setEndpoints([`${this.url}/repositories/${dbname}`])
      .setReadTimeout(30000)
      .setWriteTimeout(30000)
    const repo = await this._conn.getRepository(dbname, repositoryClientConfig)
    repo.registerParser(new SparqlJsonResultParser())
    this._repos[dbname] = repo
    return repo
  }

  async _handleResults (stream) {
    const results = []

    stream.on('data', (bindings) => {
      results.push(bindings)
    })

    return new Promise((resolve) => {
      stream.on('end', () => {
        resolve(results)
      })
    })
  }
}
