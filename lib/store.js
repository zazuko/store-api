import debug from 'debug'
const log = debug('store-api')

export class Store {
  get conn () {
    if (!this._conn) {
      throw new Error('Not connected')
    }
    return this._conn
  }

  async createDb (_dbname, _options = {}) {
    throw new Error('Not implemented')
  }

  async dropDb (_dbname, _options = {}) {
    throw new Error('Not implemented')
  }

  async clearDb (_dbname, _options = {}) {
    throw new Error('Not implemented')
  }

  async online (_dbname, _options = {}) {
    throw new Error('Not implemented')
  }

  async offline (_dbname, _options = {}) {
    throw new Error('Not implemented')
  }

  async ask (_dbname, _sparql, _options = {}) {
    throw new Error('Not implemented')
  }

  async construct (_dbname, _sparql, _options = {}) {
    throw new Error('Not implemented')
  }

  async describe (_dbname, _sparql, _options = {}) {
    throw new Error('Not implemented')
  }

  async select (_dbname, _sparql, _options = {}) {
    throw new Error('Not implemented')
  }

  async update (_dbname, _sparql, _options = {}) {
    throw new Error('Not implemented')
  }

  async import (_dbname, _ntriples) {
    throw new Error('Not implemented')
  }

  log (content) {
    log(content)
  }
}
