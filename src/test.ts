import Inspector from './inspector'

async function main() {
  const inspector = new Inspector()
  const schema = await inspector.inspect(`
    datasource db {
      provider = "mysql"
      url      = "mysql://root@localhost:3306/prisma_test"
    }

    model Settings {
      id                  String  @default(cuid()) @id
      user                String?
      User_SettingsToUser User?   @relation(fields: [user], references: [id])
      User_Settings       User[]  @relation("Settings", references: [id])
      @@index([user], name: "user")
    }

    model User {
      id                      String     @default(cuid()) @id
      Settings_SettingsToUser Settings[]
      Settings_Settings       Settings[] @relation("Settings", references: [id])
    }
  `)
  console.log(schema)
  await inspector.close()
}

main().catch(console.error)
