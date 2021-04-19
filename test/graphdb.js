import fs from 'fs'
import { describe, it } from 'mocha'
import { assert } from 'chai'
import { GraphDB } from '../lib/graphdb.js'

const randomName = () => `db_${Math.round(Math.random() * 100000000).toString(16)}`

describe('GraphDB', function () {
  this.timeout(Infinity)

  it('should create and drop DB', async () => {
    const db = new GraphDB()
    const dbname = randomName()
    const create = await db.createDb(dbname)
    const drop = await db.dropDb(dbname)
    assert.strictEqual(create, true)
    assert.strictEqual(drop, true)
  })

  it('should clear', async () => {
    const db = new GraphDB()
    const dbname = randomName()
    const create = await db.createDb(dbname)
    const insert = await db.update(dbname, fs.readFileSync('./fixtures/insert.rq').toString())
    const count = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
    const inserted = Number(count[0].tot.id.match(/"(\d+)"/)[1])

    const clear = await db.clearDb(dbname)

    setTimeout(async () => {
      const count2 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const drop = await db.dropDb(dbname)

      assert.strictEqual(create, true)
      assert.deepStrictEqual(insert, true)
      assert.ok(inserted > 0)
      assert.deepStrictEqual(clear, true)
      assert.strictEqual(Number(count2[0].tot.id.match(/"(\d+)"/)[1]), 0)
      assert.strictEqual(drop, true)
    }, 100)
  })

  it('should import', async () => {
    const db = new GraphDB()
    const dbname = randomName()
    const create = await db.createDb(dbname)

    const buffer = fs.readFileSync('./fixtures/triples.nt')
    const insert = await db.import(dbname, buffer)

    const count = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
    const inserted = Number(count[0].tot.id.match(/"(\d+)"/)[1])

    const clear = await db.clearDb(dbname)

    setTimeout(async () => {
      const count2 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const drop = await db.dropDb(dbname)

      assert.strictEqual(create, true)
      assert.deepStrictEqual(insert, true)
      assert.ok(inserted > 0)
      assert.deepStrictEqual(clear, true)
      assert.strictEqual(Number(count2[0].tot.id.match(/"(\d+)"/)[1]), 0)
      assert.strictEqual(drop, true)
    }, 100)
  })
})
