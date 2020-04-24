import { IntrospectionEngine } from '@prisma/sdk'
import { MockPrompt } from '../prompter'
import { Discard } from '../console'
import testaway from 'testaway'
import P1 from '../prisma1'
import P2 from '../prisma2'
import * as api from './'
import execa from 'execa'
import path from 'path'
import os from 'os'

const tmpdir = path.join(os.tmpdir(), 'prisma-upgrade')

it('module should load', async function () {
  this.timeout('10s')
  await testaway(tmpdir, path.join(__dirname, '..', '..'))
  const result = await execa(
    path.join(tmpdir, 'node_modules', '.bin', 'prisma-upgrade'),
    ['-h']
  )
  if (!~result.stdout.indexOf('prisma-upgrade')) {
    throw new Error("module doesn't load")
  }
})

describe('mysql', () => {
  it('@defaults, @createdAt, @updatedAt', async () => {
    const prisma1 = P1.parse(`
      type User {
        firstName: String! @default(value: "alice")
        isActive: Boolean! @default(value: false)
      }
      type Post {
        createdAt: DateTime! @createdAt
        updatedAt: DateTime! @updatedAt
        number: Int! @default(value: 5)
        float: Float! @default(value: 5.5)
      }
    `)

    const prisma2 = P2.parse(`
      datasource db {
        provider = "mysql"
        url = "mysql://prisma:pass@localhost:3306/db"
      }
      model User {
        isActive Boolean
      }
      model Post {
        createdAt DateTime
        updatedAt DateTime
        number Int
        float Float
      }
    `)

    const inspector = new IntrospectionEngine()

    await api.upgrade({
      console: new Discard(),
      prompter: new MockPrompt({
        welcome: 'y',
        default: 'y',
        createdAt: 'y',
        updatedAt: 'y',
      }),
      prisma1,
      prisma2,
      inspector,
    })

    // TODO: buffer commands and run against the actual database
  })

  it('@relation(link:INLINE)', async () => {
    const prisma1 = P1.parse(`
      type User {
        id: ID! @id
        profile: Profile! @relation(link: INLINE)
        account: Account!
      }
      type Profile {
        id: ID! @id
        user: User!
      }
      type Account {
        id: ID! @id
        user: User @relation
      }
    `)

    const prisma2 = P2.parse(`
      datasource db {
        provider = "mysql"
        url = "mysql://prisma:pass@localhost:3306/db"
      }
      model User {
        id Int @id
        profile Profile
      }
      model Profile {
        id Int @id
        user User
      }
    `)

    const inspector = new IntrospectionEngine()

    await api.upgrade({
      console: console,
      prompter: new MockPrompt({
        welcome: 'y',
        default: 'y',
        createdAt: 'y',
        updatedAt: 'y',
        inlineRelation: 'y',
      }),
      prisma1,
      prisma2,
      inspector,
    })

    // TODO: buffer commands and run against the actual database
  })

  it('json', async () => {
    const prisma1 = P1.parse(`
      type User {
        id: ID! @id
        settings: Json!
      }
    `)

    const p2 = `
      datasource db {
        provider = "mysql"
        url = "mysql://prisma:pass@localhost:3306/db"
      }
      model User {
        id Int @id
        settings String
      }
    `

    const prisma2 = P2.parse(p2)

    const inspector = {
      introspect(): Promise<{ datamodel: string }> {
        return Promise.resolve({ datamodel: p2 })
      },
    }

    await api.upgrade({
      console: console,
      prompter: new MockPrompt({
        welcome: 'y',
        json: 'y',
      }),
      prisma1,
      prisma2,
      inspector,
    })

    // TODO: buffer commands and run against the actual database
  })

  it('cuid', async () => {
    const prisma1 = P1.parse(`
      type User {
        id: ID! @id
      }
    `)

    const p2 = `
      datasource db {
        provider = "mysql"
        url = "mysql://prisma:pass@localhost:3306/db"
      }
      model User {
        id Int @id @default(now())
      }
    `

    const prisma2 = P2.parse(p2)

    const inspector = {
      introspect(): Promise<{ datamodel: string }> {
        return Promise.resolve({ datamodel: p2 })
      },
    }

    await api.upgrade({
      console: console,
      prompter: new MockPrompt({
        welcome: 'y',
        json: 'y',
      }),
      prisma1,
      prisma2,
      inspector,
    })

    // TODO: buffer commands and run against the actual database
  })

  it('uuid', async () => {
    const prisma1 = P1.parse(`
      type User {
        id: UUID! @id
      }
    `)

    const p2 = `
      datasource db {
        provider = "mysql"
        url = "mysql://prisma:pass@localhost:3306/db"
      }
      model User {
        id Int @id
      }
    `

    const prisma2 = P2.parse(p2)

    const inspector = {
      introspect(): Promise<{ datamodel: string }> {
        return Promise.resolve({ datamodel: p2 })
      },
    }

    await api.upgrade({
      console: console,
      prompter: new MockPrompt({
        welcome: 'y',
        json: 'y',
      }),
      prisma1,
      prisma2,
      inspector,
    })

    // TODO: buffer commands and run against the actual database
  })
})
