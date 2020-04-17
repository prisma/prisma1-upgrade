import { MockPrompt } from '../prompter'
import P1 from '../prisma1'
import P2 from '../prisma2'
import * as api from './'

describe('@default value is missing', () => {
  it('mysql translate defaults', async () => {
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
  })
})
