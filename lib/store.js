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
    throw new Error('Not supported')
  }

  async dropDb (_dbname, _options = {}) {
    throw new Error('Not supported')
  }

  async clearDb (_dbname, _options = {}) {
    throw new Error('Not supported')
  }

  async online (_dbname, _options = {}) {
    throw new Error('Not supported')
  }

  async offline (_dbname, _options = {}) {
    throw new Error('Not supported')
  }

  async ask (_dbname, _sparql, _options = {}) {
    throw new Error('Not supported')
  }

  async construct (_dbname, _sparql, _options = {}) {
    throw new Error('Not supported')
  }

  async describe (_dbname, _sparql, _options = {}) {
    throw new Error('Not supported')
  }

  async select (_dbname, _sparql, _options = {}) {
    throw new Error('Not supported')
  }

  async update (_dbname, _sparql, _options = {}) {
    throw new Error('Not supported')
  }

  async import (_dbname, _ntriples, _graph) {
    throw new Error('Not supported')
  }

  sparqlClientFor (_dbname, _options) {
    throw new Error('Not supported')
  }

  log (content) {
    log(content)
  }
}
