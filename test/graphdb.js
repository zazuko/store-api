import fs from 'fs'
import getStream from 'get-stream'
import { describe, it } from 'mocha'
import { assert } from 'chai'
import { GraphDB } from '../lib/index.js'

const randomName = () => `db_${Math.round(Math.random() * 359999964).toString(36)}`

describe('GraphDB', function () {
  this.timeout(Infinity)

  describe('database', function () {
    it('should create and drop DB', async () => {
      const db = new GraphDB()
      const dbname = randomName()
      const create = await db.createDb(dbname)
      const drop = await db.dropDb(dbname)
      assert.strictEqual(create, true, 'createDb failed')
      assert.strictEqual(drop, true, 'dropDb failed')
    })

    it('should clear', async () => {
      const db = new GraphDB()
      const dbname = randomName()
      const create = await db.createDb(dbname)

      const count1 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const triples1 = Number(count1[0].tot.id.match(/"(\d+)"/)[1])

      const insert = await db.update(dbname, fs.readFileSync('./fixtures/insert.rq').toString())
      const count2 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const triples2 = Number(count2[0].tot.id.match(/"(\d+)"/)[1]) - triples1

      const clear = await db.clearDb(dbname)

      const count3 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const triples3 = triples1 - Number(count3[0].tot.id.match(/"(\d+)"/)[1])
      const drop = await db.dropDb(dbname)

      assert.strictEqual(create, true, 'createDb failed')
      assert.deepStrictEqual(insert, true, 'writing data failed')
      assert.ok(triples2 > 0, 'no data inserted')
      assert.deepStrictEqual(clear, true, 'clearDb failed')
      assert.strictEqual(triples3, 0, 'some data left after clear')
      assert.strictEqual(drop, true, 'dropDb failed')
    })

    it('should import', async () => {
      const db = new GraphDB()
      const dbname = randomName()
      const create = await db.createDb(dbname)

      const count1 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const triples1 = Number(count1[0].tot.id.match(/"(\d+)"/)[1])

      const buffer = fs.readFileSync('./fixtures/triples.nt')
      const insert = await db.import(dbname, buffer)

      const count2 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const triples2 = Number(count2[0].tot.id.match(/"(\d+)"/)[1]) - triples1

      const clear = await db.clearDb(dbname)

      const count3 = await db.select(dbname, 'select (count(*) as ?tot) where { ?s ?p ?o. }')
      const triples3 = triples1 - Number(count3[0].tot.id.match(/"(\d+)"/)[1])
      const drop = await db.dropDb(dbname)

      assert.strictEqual(create, true, 'createDb failed')
      assert.deepStrictEqual(insert, true, 'writing data failed')
      assert.ok(triples2 > 0, 'no data inserted')
      assert.deepStrictEqual(clear, true, 'clearDb failed')
      assert.strictEqual(triples3, 0, 'some data left after clear')
      assert.strictEqual(drop, true, 'dropDb failed')
    })
  })

  describe('queries', function () {
    beforeEach(async function () {
      this.dbname = randomName()
      this.db = new GraphDB()
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

      assert.deepStrictEqual(result, [
        {
          termType: 'Quad',
          value: '',
          subject: {
            termType: 'NamedNode',
            value: 'http://favorite-authors'
          },
          predicate: {
            termType: 'NamedNode',
            value: 'http://author'
          },
          object: {
            termType: 'Literal',
            value: 'A.N. Other',
            language: '',
            datatype: {
              termType: 'NamedNode',
              value: 'http://www.w3.org/2001/XMLSchema#string'
            }
          },
          graph: {
            termType: 'DefaultGraph',
            value: ''
          }
        }
      ], 'construct returned unexpected data')
    })

    it('describe', async function () {
      const result = await this.db.describe(this.dbname, 'describe <http://example/book1>')

      assert.deepStrictEqual(result, [
        { termType: 'Quad', value: '', subject: { termType: 'NamedNode', value: 'http://example/book1' }, predicate: { termType: 'NamedNode', value: 'http://purl.org/dc/elements/1.1/creator' }, object: { termType: 'Literal', value: 'A.N. Other', language: '', datatype: { termType: 'NamedNode', value: 'http://www.w3.org/2001/XMLSchema#string' } }, graph: { termType: 'DefaultGraph', value: '' } },
        { termType: 'Quad', value: '', subject: { termType: 'NamedNode', value: 'http://example/book1' }, predicate: { termType: 'NamedNode', value: 'http://purl.org/dc/elements/1.1/title' }, object: { termType: 'Literal', value: 'A new book', language: '', datatype: { termType: 'NamedNode', value: 'http://www.w3.org/2001/XMLSchema#string' } }, graph: { termType: 'DefaultGraph', value: '' } }
      ], 'describe returned unexpected data')
    })

    it('select', async function () {
      const result = await this.db.select(this.dbname, 'select ?o where { <http://example/book1> <http://purl.org/dc/elements/1.1/creator> ?o . }')

      assert.deepStrictEqual(result, [{ o: { id: '"A.N. Other"' } }], 'select returned unexpected data')
    })
  })

  describe('sparql http client', function () {
    beforeEach(async function () {
      this.timeout(Infinity)
      this.dbname = randomName()
      this.db = new GraphDB()
      await this.db.createDb(this.dbname)
      const buffer = fs.readFileSync('./fixtures/triples.nt')
      await this.db.import(this.dbname, buffer, 'http://example.graph')
      this.client = this.db.sparqlClientFor(this.dbname)
    })

    afterEach(async function () {
      await this.db.dropDb(this.dbname)
    })

    it('query', async function () {
      const result = await this.client.query.ask('ask { graph <http://example.graph> { <http://example/book9> ?p "book 9"} }')
      assert.strictEqual(result, true)
    })

    it('graph store', async function () {
      const stream = await this.client.store.get({ value: 'http://example.graph' })
      const result = await getStream.array(stream)
      assert.strictEqual(result.length, 20)
    })
  })
})
