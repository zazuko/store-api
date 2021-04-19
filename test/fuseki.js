import fs from 'fs'
import { describe, it } from 'mocha'
import { assert } from 'chai'
import { Fuseki } from '../lib/fuseki.js'

const randomName = () => `db_${Math.round(Math.random() * 100000000).toString(16)}`

describe('fuseki', function () {
  this.timeout(Infinity)

  it('should create and drop DB', async () => {
    const db = new Fuseki()
    const dbname = randomName()
    const create = await db.createDb(dbname)
    const drop = await db.dropDb(dbname)
    assert.strictEqual(create, true)
    assert.strictEqual(drop, true)
  })

  it('should clear', async () => {
    const db = new Fuseki()
    const dbname = randomName()
    const create = await db.createDb(dbname)
    const insert = await db.update(dbname, fs.readFileSync('./fixtures/insert.rq').toString())
    const count = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
    const inserted = Number(count.results.bindings[0].tot.value)
    const clear = await db.clearDb(dbname)
    const count2 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
    const drop = await db.dropDb(dbname)

    assert.strictEqual(create, true)
    assert.deepStrictEqual(insert, true)
    assert.ok(inserted > 0)
    assert.deepStrictEqual(clear, true)
    assert.strictEqual(Number(count2.results.bindings[0].tot.value), 0)
    assert.strictEqual(drop, true)
  })

  it('should import', async () => {
    const db = new Fuseki()
    const dbname = randomName()
    const create = await db.createDb(dbname)

    const buffer = fs.readFileSync('./fixtures/triples.nt')
    const insert = await db.import(dbname, buffer)

    const count = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
    const inserted = Number(count.results.bindings[0].tot.value)
    const clear = await db.clearDb(dbname)
    const count2 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
    const drop = await db.dropDb(dbname)

    assert.strictEqual(create, true)
    assert.deepStrictEqual(insert, true)
    assert.ok(inserted > 0)
    assert.deepStrictEqual(clear, true)
    assert.strictEqual(Number(count2.results.bindings[0].tot.value), 0)
    assert.strictEqual(drop, true)
  })

  it('should on-offline', async () => {
    const db = new Fuseki()
    const dbname = randomName()
    await db.createDb(dbname)

    let error
    const buffer = fs.readFileSync('./fixtures/triples.nt')

    await db.offline(dbname)
    try {
      await db.import(dbname, buffer)
    }
    catch (err) {
      error = err
    }
    assert.ok(typeof error !== 'undefined')

    error = undefined
    await db.online(dbname)
    try {
      await db.import(dbname, buffer)
    }
    catch (err) {
      error = err
    }
    assert.ok(typeof error === 'undefined')

    await db.dropDb(dbname)
  })
})
