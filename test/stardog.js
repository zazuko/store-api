import fs from 'fs'
import { describe, it } from 'mocha'
import { assert } from 'chai'
import { Stardog } from '../lib/stardog.js'

const randomName = () => `db_${Math.round(Math.random() * 359999964).toString(36)}`

describe('stardog', function () {
  this.timeout(Infinity)

  describe('database', function () {
    it('should create and drop DB', async () => {
      const db = new Stardog()
      const dbname = randomName()
      const create = await db.createDb(dbname)
      const drop = await db.dropDb(dbname)
      assert.ok(create.startsWith('Successfully created database'), 'createDb failed')
      assert.ok(drop.includes('was successfully dropped'), 'dropDb failed')
    })

    it('should clear', async () => {
      const db = new Stardog()
      const dbname = randomName()
      const create = await db.createDb(dbname)
      const insert = await db.update(dbname, fs.readFileSync('./fixtures/insert.rq').toString())
      const count = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const inserted = Number(count.results.bindings[0].tot.value)
      const clear = await db.clearDb(dbname)
      const count2 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const drop = await db.dropDb(dbname)

      assert.ok(create.startsWith('Successfully created database'), 'createDb failed')
      assert.deepStrictEqual(insert, true, 'inserting data failed')
      assert.ok(inserted > 0, 'no data inserted')
      assert.deepStrictEqual(clear, { added: 0, removed: inserted }, 'wrong deleted triple count')
      assert.strictEqual(Number(count2.results.bindings[0].tot.value), 0, 'some data left after clear')
      assert.ok(drop.includes('was successfully dropped'), 'dropDb failed')
    })

    it('should import', async () => {
      const db = new Stardog()
      const dbname = randomName()
      const create = await db.createDb(dbname)

      const buffer = fs.readFileSync('./fixtures/triples.nt')
      const insert = await db.import(dbname, buffer)

      const count = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const inserted = Number(count.results.bindings[0].tot.value)
      const clear = await db.clearDb(dbname)
      const count2 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const drop = await db.dropDb(dbname)

      assert.ok(create.startsWith('Successfully created database'), 'createDb failed')
      assert.deepStrictEqual(insert, { added: inserted, removed: 0 }, 'wrong inserted triple count')
      assert.ok(inserted > 0, 'no data inserted')
      assert.deepStrictEqual(clear, { added: 0, removed: inserted }, 'wrong deleted triple count')
      assert.strictEqual(Number(count2.results.bindings[0].tot.value), 0, 'some data left after clear')
      assert.ok(drop.includes('was successfully dropped'), 'dropDb failed')
    })

    it('should on-offline', async () => {
      const db = new Stardog()
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
      this.db = new Stardog()
      await this.db.createDb(this.dbname)
      await this.db.update(this.dbname, fs.readFileSync('./fixtures/insert.rq').toString())
    })

    afterEach(async function () {
      await this.db.dropDb(this.dbname)
    })

    it('ask', async function () {
      const success = await this.db.ask(this.dbname, 'ask {<http://example/book1> ?p "A new book"}')
      assert.strictEqual(success, true, 'ask did not return true')

      const failure = await this.db.ask(this.dbname, 'ask {<http://example/book1> ?p "nothing"}')
      assert.strictEqual(failure, false, 'ask did not return false')
    })

    it('construct', async function () {
      const result = await this.db.construct(this.dbname, 'CONSTRUCT { <http://favorite-authors> <http://author> ?name } WHERE { ?s <http://purl.org/dc/elements/1.1/creator> ?name }')
      assert.strictEqual(result, '<http://favorite-authors> <http://author> "A.N. Other" .', 'construct returned unexpected data')
    })

    it('describe', async function () {
      const result = await this.db.describe(this.dbname, 'describe <http://example/book1>')
      assert.strictEqual(result, `<http://example/book1> <http://purl.org/dc/elements/1.1/title> "A new book" ;
   <http://purl.org/dc/elements/1.1/creator> "A.N. Other" .`, 'describe returned unexpected data')
    })

    it('select', async function () {
      const result = await this.db.select(this.dbname, 'select ?o where { <http://example/book1> <http://purl.org/dc/elements/1.1/creator> ?o . }')
      assert.deepStrictEqual(result.results.bindings, [{ o: { type: 'literal', value: 'A.N. Other' } }], 'select returned unexpected data')
    })
  })
})
