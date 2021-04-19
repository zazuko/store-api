import stardog from 'stardog'
import { Store } from './interface.js'
import { chunkBetween } from './utils.js'
const { Connection, db, query } = stardog

export class Stardog extends Store {
  constructor () {
    super()
    this._conn = new Connection({
      username: 'admin',
      password: 'admin',
      endpoint: 'http://localhost:5820'
    })
  }

  // see options: https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbcreateconn-database-databaseoptions-options-params
  async createDb (dbname, options = {}) {
    options = Object.assign({ databaseOptions: {}, options: {}, params: {} }, options)

    return this._handleResult(
      db.create(this.conn, dbname, options.databaseOptions, options.options, options.params)
    )
  }

  // see options: https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbdropconn-database-params
  async dropDb (dbname, options = {}) {
    options = Object.assign({ params: {} }, options)

    return this._handleResult(
      db.drop(this.conn, dbname, options.params)
    )
  }

  // see options: https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbdropconn-database-params
  async clearDb (dbname, options = {}) {
    options = Object.assign({ params: {} }, options)

    const tx = new Transaction(this.conn, dbname, options.params)
    await tx.add((transactionId) => db.clear(this.conn, dbname, transactionId, options.params))
    return this._handleResult(tx.execute())
  }

  // see options: https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbonlineconn-database-params
  async online (dbname, options = {}) {
    options = Object.assign({ params: {} }, options)

    return this._handleResult(
      db.online(this.conn, dbname, options.params)
    )
  }

  // see options: https://github.com/stardog-union/stardog.js/tree/065edf84d92f50dc6ad9a6548d0bc9b16325cd3d#dbofflineconn-database-params
  async offline (dbname, options = {}) {
    options = Object.assign({ params: {} }, options)

    return this._handleResult(
      db.offline(this.conn, dbname, options.params)
    )
  }

  // https://github.com/stardog-union/stardog.js/#queryexecuteconn-database-query-accept-params-additionalhandlers
  async select (dbname, sparql, options = {}) {
    return this._query(dbname, sparql, options)
  }

  // https://github.com/stardog-union/stardog.js/#queryexecuteconn-database-query-accept-params-additionalhandlers
  async update (dbname, sparql, options = {}) {
    return this._query(dbname, sparql, options)
  }

  async _query (dbname, sparql, options = {}) {
    options = Object.assign({ options: { accept: 'application/json' }, params: {}, additionalHandlers: {} }, options)

    return this._handleResult(
      query.execute(this.conn, dbname, sparql, options.accept, options.params, options.additionalHandlers)
    )
  }

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

  async import (dbname, ntriples) {
    const mapper = (chunk) => `
    INSERT DATA {
      ${chunk}
    }`
    const queries = chunkBetween(ntriples, mapper, 1_000)
    return this.queries(dbname, queries)
  }

  async _handleResult (response) {
    const result = await response
    if (result.ok) {
      if (result.body?.message) {
        return result.body.message
      }
      return result.body || true
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
      console.warn('rolling back  ')
      await db.transaction.rollback(this.conn, this.dbname, this.tx, this.params)
    }
    return result
  }

  async begin () {
    const response = await db.transaction.begin(this.conn, this.dbname, this.params)
    this.tx = response.transactionId
  }
}
