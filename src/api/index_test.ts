import { uriToCredentials } from '@prisma/sdk'
import Inspector from '../inspector'
import testaway from 'testaway'
import * as p1 from '../prisma1'
import * as p2 from '../prisma2'
import * as sql from '../sql'
import mariadb from 'mariadb'
import yaml from 'js-yaml'
import * as api from './'
import chalk from 'chalk'
import execa from 'execa'
import assert from 'assert'
import path from 'path'
import util from 'util'
import url from 'url'
import fs from 'fs'
import pg from 'pg'
import os from 'os'

const tmpdir = path.join(os.tmpdir(), 'prisma-upgrade')
const readFile = util.promisify(fs.readFile)
const userInfo = os.userInfo()

it('import-able', async function () {
  this.timeout('60s')
  await testaway(tmpdir, path.join(__dirname, '..', '..'))
  const result = await execa(
    path.join(tmpdir, 'node_modules', '.bin', 'prisma-upgrade'),
    ['-h']
  )
  if (!~result.stdout.indexOf('prisma-upgrade')) {
    throw new Error("module doesn't load")
  }
})

const dir = path.join(__dirname, '..', '..', 'examples')
const allTests = fs.readdirSync(dir)

describe('mysql', function () {
  this.timeout('5s')
  const tests = allTests.filter((test) => test.startsWith('mysql'))
  tests.forEach((name) => {
    describe(name, () => {
      let db: mariadb.Connection
      let engine: Inspector

      after(async () => {
        db && (await db.end())
        engine.close()
      })

      it('test', async () => {
        const abspath = path.join(dir, name)
        const expected = await readFile(
          path.join(abspath, 'expected.prisma'),
          'utf8'
        )
        const prismaYaml = path.join(abspath, 'prisma.yml')
        const yml = yaml.safeLoad(await readFile(prismaYaml, 'utf8'))
        const datamodel = await concatDatamodels(path.dirname(prismaYaml), yml)
        const p2schema = new p2.Schema(
          await readFile(path.join(abspath, 'schema.prisma'), 'utf8')
        )
        const p1schema = p1.parse(datamodel)
        // NOTE: this assumes you have a local mysql instance running
        p2schema.setURL('mysql://root@localhost:3306/prisma_test')
        const url = p2schema.url()
        if (!url) {
          throw new Error('Expected url to not be void')
        }
        const credentials = uriToCredentials(url)
        db = await mariadb.createConnection({
          host: credentials.host,
          port: credentials.port,
          user: credentials.user,
          password: credentials.password,
          multipleStatements: true,
        })
        engine = new Inspector()
        try {
          await db.query(`drop database prisma_test;`)
        } catch (e) {
          // do nothing
        }
        await db.query(`create database prisma_test;`)
        await db.query(`use prisma_test;`)
        db.query(await readFile(path.join(abspath, 'dump.sql'), 'utf8'))
        await test(db, engine, expected, url, p1schema, p2schema)
      })
    })
  })
})

describe('postgres', () => {
  const tests = allTests.filter((test) => test.startsWith('postgres'))
  tests.forEach((name) => {
    describe(name, () => {
      let db: pg.Client
      let engine: Inspector

      after(async () => {
        db && (await db.end())
        engine && engine.close()
      })

      it('test', async () => {
        const abspath = path.join(dir, name)
        const expected = await readFile(
          path.join(abspath, 'expected.prisma'),
          'utf8'
        )
        const prismaYaml = path.join(abspath, 'prisma.yml')
        const yml = yaml.safeLoad(await readFile(prismaYaml, 'utf8'))
        const datamodel = await concatDatamodels(path.dirname(prismaYaml), yml)
        const pathname = url.parse(yml.endpoint).pathname || ''
        const pgschema = pathname.slice(1)
          ? pathname.slice(1).replace(/\//g, '$')
          : 'default$default'

        const p2schema = new p2.Schema(
          await readFile(path.join(abspath, 'schema.prisma'), 'utf8')
        )
        const p1schema = p1.parse(datamodel)
        // NOTE: this assumes you have a local postgres instance running
        const pgo = url.parse('postgres://localhost:5432/prisma_test', true)
        pgo.auth = userInfo.username
        if (pgschema) {
          pgo.query['schema'] = pgschema
        }
        p2schema.setURL(url.format(pgo))
        const credentials = uriToCredentials(url.format(pgo))
        const initialDB = new pg.Client({
          host: credentials.host,
          port: credentials.port,
          database: 'postgres',
          password: credentials.password,
        })
        await initialDB.connect()
        try {
          await initialDB.query(`drop database prisma_test;`)
        } catch (e) {
          // do nothing
        }
        await initialDB.query(`create database prisma_test;`)
        await initialDB.query(`drop role if exists root;`)
        await initialDB.query(`create role root;`)
        await initialDB.end()
        // create actual DB connect
        db = new pg.Client({
          host: credentials.host,
          port: credentials.port,
          database: 'prisma_test',
          password: credentials.password,
        })
        await db.connect()
        engine = new Inspector()
        await db.query(await readFile(path.join(abspath, 'dump.sql'), 'utf8'))
        await test(db, engine, expected, pgschema, p1schema, p2schema)
      })
    })
  })
})

// describe('postgres', () => {
//   let engine: Inspector

//   after(async () => {
//     engine.close()
//   })

//   const tests = allTests.filter((test) => test.startsWith('postgres'))
//   tests.forEach((name) => {
//     // const db = new pg.Client({})
//     // let connString =
//     //   process.env.TEST_MYSQL_URI || 'postgres://root@localhost:3306'
//     // const credentials = uriToCredentials(connString)
//     // before(async () => {
//     //   let connString =
//     //     process.env.TEST_MYSQL_URI || 'mysql://root@localhost:3306'
//     //   const credentials = uriToCredentials(connString)
//     //   db = await pg.Client({
//     //     host: credentials.host,
//     //     port: credentials.port,
//     //     database: credentials.database,
//     //     user: credentials.user,
//     //     password: credentials.password,
//     //     multipleStatements: true,
//     //   })
//     // })

//     describe(name, () => {
//       after(async () => {
//         // db && (await db.end())
//         // engine.close()
//       })

//       it('test', async () => {
//         console.log()
//       })
//     })
//   })

//   // beforeEach(async () => {
//   // try {
//   //   await db.query(`drop database prisma;`)
//   // } catch (e) {
//   //   // do nothing
//   // }
//   // await db.query(`create database prisma;`)
//   // await db.query(`use prisma;`)
//   // })

//   // afterEach(async () => {})

//   // const tests = allTests.filter((test) => test.startsWith('postgres'))
//   // tests.forEach((name) => {
//   //   it(name, async () => {
//   //     // await test(name, db)
//   //   })
//   // })
// })

interface DB {
  query(query: string): Promise<any>
}

async function test(
  db: DB,
  engine: Inspector,
  expected: string,
  url: string,
  p1schema: p1.Schema,
  p2schema: p2.Schema
) {
  // const abspath = path.join(dir, name)
  // const dumpPath = path.join(abspath, 'dump.sql')
  // const dump = await readFile(dumpPath, 'utf8')
  // const schemaPrisma = await readFile(
  //   path.join(abspath, 'schema.prisma'),
  //   'utf8'
  // )
  // const datamodelGraphQL = await readFile(
  //   path.join(abspath, 'datamodel.graphql'),
  //   'utf8'
  // )
  // const p1schema = p1.parse(datamodelGraphQL)
  // var p2schema = new p2.Schema(schemaPrisma)

  // await db.query(dump)

  var { ops, schema } = await api.upgrade({
    url: url,
    prisma1: p1schema,
    prisma2: p2schema,
  })

  // run the queries
  const queries = sql.translate(schema.provider(), ops)
  for (let query of queries) {
    try {
      await db.query(query)
    } catch (e) {
      console.log(query)
      throw e
    }
  }

  // re-introspect
  const datamodel = await engine.inspect(schema.toString())

  // apply p2schema again
  var p2schema = new p2.Schema(datamodel)
  var { ops, schema } = await api.upgrade({
    url: url,
    prisma1: p1schema,
    prisma2: p2schema,
  })

  if (ops.length) {
    console.log(schema.toString())
    console.log(ops)
    assert.equal(0, ops.length, 'expected 0 ops the 2nd time around')
  }

  // schema
  const actual = schema.toString()
  if (expected !== actual) {
    console.log('')
    console.log('Actual:')
    console.log('')
    console.log(chalk.dim(actual))
    console.log('')
    console.log('Expected:')
    console.log('')
    console.log(chalk.dim(expected))
    console.log('')
    console.log(assert.equal(actual, expected))
  }
}

// describe('mysql', () => {
//   it('@defaults, @createdAt, @updatedAt', async () => {
//     const prisma1 = P1.parse(`
//       type User {
//         firstName: String! @default(value: "alice")
//         isActive: Boolean! @default(value: false)
//       }
//       type Post {
//         createdAt: DateTime! @createdAt
//         updatedAt: DateTime! @updatedAt
//         number: Int! @default(value: 5)
//         float: Float! @default(value: 5.5)
//       }
//     `)

//     const prisma2 = P2.parse(`
//       datasource db {
//         provider = "mysql"
//         url = "mysql://prisma:pass@localhost:3306/db"
//       }
//       model User {
//         isActive Boolean
//       }
//       model Post {
//         createdAt DateTime
//         updatedAt DateTime
//         number Int
//         float Float
//       }
//     `)

//     const inspector = new IntrospectionEngine()

//     await api.upgrade({
//       console: new Discard(),
//       prompter: new MockPrompt({
//         welcome: 'y',
//         default: 'y',
//         createdAt: 'y',
//         updatedAt: 'y',
//       }),
//       prisma1,
//       prisma2,
//       inspector,
//     })

//     // TODO: buffer commands and run against the actual database
//   })

//   it('@relation(link:INLINE)', async () => {
//     const prisma1 = P1.parse(`
//       type User {
//         id: ID! @id
//         profile: Profile! @relation(link: INLINE)
//         account: Account!
//       }
//       type Profile {
//         id: ID! @id
//         user: User!
//       }
//       type Account {
//         id: ID! @id
//         user: User @relation
//       }
//     `)

//     const prisma2 = P2.parse(`
//       datasource db {
//         provider = "mysql"
//         url = "mysql://prisma:pass@localhost:3306/db"
//       }
//       model User {
//         id Int @id
//         profile Profile
//       }
//       model Profile {
//         id Int @id
//         user User
//       }
//     `)

//     const inspector = new IntrospectionEngine()

//     await api.upgrade({
//       console: console,
//       prompter: new MockPrompt({
//         welcome: 'y',
//         default: 'y',
//         createdAt: 'y',
//         updatedAt: 'y',
//         inlineRelation: 'y',
//       }),
//       prisma1,
//       prisma2,
//       inspector,
//     })

//     // TODO: buffer commands and run against the actual database
//   })

//   it('json', async () => {
//     const prisma1 = P1.parse(`
//       type User {
//         id: ID! @id
//         settings: Json!
//       }
//     `)

//     const p2 = `
//       datasource db {
//         provider = "mysql"
//         url = "mysql://prisma:pass@localhost:3306/db"
//       }
//       model User {
//         id Int @id
//         settings String
//       }
//     `

//     const prisma2 = P2.parse(p2)

//     const inspector = {
//       introspect(): Promise<{ datamodel: string }> {
//         return Promise.resolve({ datamodel: p2 })
//       },
//     }

//     await api.upgrade({
//       console: console,
//       prompter: new MockPrompt({
//         welcome: 'y',
//         json: 'y',
//       }),
//       prisma1,
//       prisma2,
//       inspector,
//     })

//     // TODO: buffer commands and run against the actual database
//   })

//   it('cuid', async () => {
//     const prisma1 = P1.parse(`
//       type User {
//         id: ID! @id
//       }
//     `)

//     const p2 = `
//       datasource db {
//         provider = "mysql"
//         url = "mysql://prisma:pass@localhost:3306/db"
//       }
//       model User {
//         id Int @id @default(now())
//       }
//     `

//     const prisma2 = P2.parse(p2)

//     const inspector = {
//       introspect(): Promise<{ datamodel: string }> {
//         return Promise.resolve({ datamodel: p2 })
//       },
//     }

//     await api.upgrade({
//       console: console,
//       prompter: new MockPrompt({
//         welcome: 'y',
//         json: 'y',
//       }),
//       prisma1,
//       prisma2,
//       inspector,
//     })

//     // TODO: buffer commands and run against the actual database
//   })

//   it('uuid', async () => {
//     const prisma1 = P1.parse(`
//       type User {
//         id: UUID! @id
//       }
//     `)

//     const p2 = `
//       datasource db {
//         provider = "mysql"
//         url = "mysql://prisma:pass@localhost:3306/db"
//       }
//       model User {
//         id Int @id
//       }
//     `

//     const prisma2 = P2.parse(p2)

//     const inspector = {
//       introspect(): Promise<{ datamodel: string }> {
//         return Promise.resolve({ datamodel: p2 })
//       },
//     }

//     await api.upgrade({
//       console: console,
//       prompter: new MockPrompt({
//         welcome: 'y',
//         json: 'y',
//       }),
//       prisma1,
//       prisma2,
//       inspector,
//     })

//     // TODO: buffer commands and run against the actual database
//   })
// })

async function concatDatamodels(wd: string, yml: any): Promise<string> {
  if (!('datamodel' in yml)) {
    return ''
  }
  const datamodels = [].concat(yml.datamodel)
  const models: string[] = []
  for (let dm of datamodels) {
    models.push(await readFile(path.join(wd, dm), 'utf8'))
  }
  return models.join('\n\n')
}
