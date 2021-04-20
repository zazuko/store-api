import fs from 'fs'
import { describe, it } from 'mocha'
import { assert } from 'chai'
import { Fuseki } from '../lib/index.js'

const randomName = () => `db_${Math.round(Math.random() * 359999964).toString(36)}`

describe('fuseki', function () {
  this.timeout(Infinity)

  describe('database', function () {
    it('should create and drop DB', async () => {
      const db = new Fuseki()
      const dbname = randomName()
      const create = await db.createDb(dbname)
      const drop = await db.dropDb(dbname)
      assert.strictEqual(create, true, 'createDb failed')
      assert.strictEqual(drop, true, 'dropDb failed')
    })

    it('should clear', async () => {
      const db = new Fuseki()
      const dbname = randomName()
      const create = await db.createDb(dbname)
      const insert = await db.update(dbname, fs.readFileSync('./fixtures/insert.rq').toString())
      const count = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const clear = await db.clearDb(dbname)
      const count2 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const drop = await db.dropDb(dbname)

      assert.strictEqual(create, true, 'createDb failed')
      assert.deepStrictEqual(insert, true, 'writing data failed')
      const inserted = Number(count.results.bindings[0].tot.value)
      assert.ok(inserted > 0, 'no data inserted')
      assert.deepStrictEqual(clear, true, 'clearDb failed')
      assert.strictEqual(Number(count2.results.bindings[0].tot.value), 0, 'some data left after clear')
      assert.strictEqual(drop, true, 'dropDb failed')
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

      assert.strictEqual(create, true, 'createDb failed')
      assert.deepStrictEqual(insert, true, 'writing data failed')
      assert.ok(inserted > 0, 'no data inserted')
      assert.deepStrictEqual(clear, true, 'clearDb failed')
      assert.strictEqual(Number(count2.results.bindings[0].tot.value), 0, 'some data left after clear')
      assert.strictEqual(drop, true, 'dropDb failed')
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
      assert.ok(typeof error !== 'undefined', 'no error when writing to offline DB')

      error = undefined
      await db.online(dbname)
      try {
        await db.import(dbname, buffer)
      }
      catch (err) {
        error = err
      }
      assert.ok(typeof error === 'undefined', 'writing to online DB failed')

      await db.dropDb(dbname)
    })
  })

  describe('queries', function () {
    beforeEach(async function () {
      this.dbname = randomName()
      this.db = new Fuseki()
      await this.db.createDb(this.dbname)
      await this.db.update(this.dbname, fs.readFileSync('./fixtures/insert.rq').toString())
    })

    afterEach(async function () {
      await this.db.dropDb(this.dbname)
    })

    it('ask', async function () {
      const success = await this.db.ask(this.dbname, 'ask {<http://example/book1> ?p "A new book"}')
      assert.deepStrictEqual(success, { head: {}, boolean: true }, 'ask did not return true')

      const failure = await this.db.ask(this.dbname, 'ask {<http://example/book1> ?p "nothing"}')
      assert.deepStrictEqual(failure, { head: {}, boolean: false }, 'ask did not return false')
    })

    it('construct', async function () {
      const result = await this.db.construct(this.dbname, 'CONSTRUCT { <http://favorite-authors> <http://author> ?name } WHERE { ?s <http://purl.org/dc/elements/1.1/creator> ?name }')
      assert.deepStrictEqual(result, {
        '@id': 'http://favorite-authors',
        author: 'A.N. Other',
        '@context': { author: { '@id': 'http://author' } }
      }, 'construct returned unexpected data')
    })

    it('describe', async function () {
      const result = await this.db.describe(this.dbname, 'describe <http://example/book1>')
      assert.deepStrictEqual(result, {
        '@id': 'http://example/book1',
        creator: 'A.N. Other',
        title: 'A new book',
        '@context': {
          creator: { '@id': 'http://purl.org/dc/elements/1.1/creator' },
          title: { '@id': 'http://purl.org/dc/elements/1.1/title' }
        }
      }, 'describe returned unexpected data')
    })

    it('select', async function () {
      const result = await this.db.select(this.dbname, 'select ?o where { <http://example/book1> <http://purl.org/dc/elements/1.1/creator> ?o . }')
      assert.deepStrictEqual(result.results.bindings, [{ o: { type: 'literal', value: 'A.N. Other' } }], 'select returned unexpected data')
    })
  })
})
