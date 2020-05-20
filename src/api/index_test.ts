import { uriToCredentials } from '@prisma/sdk'
import { MockPrompt } from '../prompter'
import Inspector from '../inspector'
import { Console } from '../console'
import { print } from 'prismafile'
// import testaway from 'testaway'
import mariadb from 'mariadb'
import P1 from '../prisma1'
import P2 from '../prisma2'
import * as api from './'
import chalk from 'chalk'
// import execa from 'execa'
import assert from 'assert'
import path from 'path'
import util from 'util'
import fs from 'fs'
// import os from 'os'

// const tmpdir = path.join(os.tmpdir(), 'prisma-upgrade')
const readFile = util.promisify(fs.readFile)

// it('module should load', async function() {
//   this.timeout('10s')
//   await testaway(tmpdir, path.join(__dirname, '..', '..'))
//   const result = await execa(
//     path.join(tmpdir, 'node_modules', '.bin', 'prisma-upgrade'),
//     ['-h']
//   )
//   if (!~result.stdout.indexOf('prisma-upgrade')) {
//     throw new Error("module doesn't load")
//   }
// })

const engine = new Inspector()

let connectionString =
  process.env.TEST_MYSQL_URI || 'mysql://root@localhost:3306'
const credentials = uriToCredentials(connectionString)
const dir = path.join(__dirname, '..', '..', 'examples')
const tests = fs.readdirSync(dir)

describe('mysql', () => {
  let db: mariadb.Connection
  before(async () => {
    db = await mariadb.createConnection({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      user: credentials.user,
      password: credentials.password,
      multipleStatements: true,
    })
  })

  after(async () => {
    db && (await db.end())
    engine.close()
  })

  beforeEach(async () => {
    await db.query(`create database prisma_mysql_test;`)
    await db.query(`use prisma_mysql_test;`)
  })

  afterEach(async () => {
    await db.query(`drop database prisma_mysql_test;`)
  })

  const mysqlTests = tests.filter((test) => test.startsWith('mysql'))
  mysqlTests.forEach((test) => {
    it(test, async () => {
      const abspath = path.join(dir, test)
      const dumpPath = path.join(abspath, 'dump.sql')
      const dump = await readFile(dumpPath, 'utf8')
      const before = await readFile(path.join(abspath, 'schema.prisma'), 'utf8')
      const p2 = P2.parse(before)
      const p1 = P1.parse(
        await readFile(path.join(abspath, 'datamodel.graphql'), 'utf8')
      )
      await db.query(dump)
      const prompt = new MockPrompt({
        welcome: 'y',
        default: 'y',
        createdAt: 'y',
        updatedAt: 'y',
        inlineRelation: 'y',
        json: 'y',
      })
      const con: Console = {
        async log(..._args: any[]) {
          // console.log(...args)
        },
        async sql(sql) {
          console.log(sql)
          await db.query(sql)
        },
        async error(...args: any[]) {
          console.error(...args)
        },
      }

      const schema = await api.upgrade({
        console: con,
        inspector: engine,
        prompter: prompt,
        prisma1: p1,
        prisma2: p2,
      })

      const expectedPath = path.join(abspath, 'expected.prisma')
      const expected = await readFile(expectedPath, 'utf8')
      const actual = print(schema)
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

      // console.log(dump)
      // console.log(schema)
      // console.log(db)
    })
  })
})

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
