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

it('module should load', async () => {
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
    })

    // TODO: buffer commands and run against the actual database
  })

  it('@relation(link:INLINE)', async () => {
    const prisma1 = P1.parse(`
      type User {
        id: ID! @id
        profile: Profile! @relation(link: INLINE)
      }
      type Profile {
        id: ID! @id
        user: User!
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

    await api.upgrade({
      console: console,
      prompter: new MockPrompt({
        welcome: 'y',
        default: 'y',
        createdAt: 'y',
        updatedAt: 'y',
      }),
      prisma1,
      prisma2,
    })

    // TODO: buffer commands and run against the actual database
  })
})
