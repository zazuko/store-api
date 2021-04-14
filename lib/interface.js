import debug from 'debug'
const log = debug('store-api')

export class Store {
  constructor () {}

  get conn () {
    if (!this._conn) {
      throw new Error('Not connected')
    }
    return this._conn
  }

  log (content) {
    log(content)
  }
}
