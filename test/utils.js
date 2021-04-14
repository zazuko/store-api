import { assert } from 'chai'
import { describe, it } from 'mocha'
import { chunkBetween } from '../lib/utils.js'

describe('utils', function () {
  it('chunkBetween', async () => {
    const result = chunkBetween('a\nb\nc', (chunk) => `INSERT { ${chunk} }`, 2)
    assert.deepStrictEqual(result, ['INSERT { a\nb }', 'INSERT { c }'])
  })
})
