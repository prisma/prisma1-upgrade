const sdk = require('@prisma/sdk')
const exec = require('execa')
const path = require('path')
const fs = require('fs')

const prismaPath = require.resolve('@prisma/cli')
const exampleDir = path.join(__dirname, '..', 'prisma-2-examples')

async function main() {
  const examples = fs.readdirSync(exampleDir)
  for (let example of examples) {
    const schemaPath = path.join(exampleDir, example, 'schema.prisma')
    console.log('creating DB', schemaPath)
    await exec(
      prismaPath,
      [
        'migrate',
        'save',
        '--experimental',
        '--schema=' + schemaPath,
        '--create-db',
        '--name',
        'init',
      ],
      {
        stdio: 'inherit',
        env: {
          CI: 1,
        },
      }
    )
    console.log('created DB')
    console.log('migrating')
    await exec(
      prismaPath,
      ['migrate', 'up', '--experimental', '--schema=' + schemaPath],
      {
        stdio: 'inherit',
        env: {
          CI: 1,
        },
      }
    )
    console.log('migrated', schemaPath)
    await exec(prismaPath, ['introspect', `--schema=` + schemaPath], {
      stdio: 'inherit',
      env: {
        CI: 1,
      },
    })
  }

  console.log(examples)

  // await exec(prismaPath, [
  //   'migrate',
  //   'save',
  //   '--experimental',
  //   '--schema=./' + schemaPath,
  //   '--create-db',
  //   '--name',
  //   'init',
  // ])
  // prisma2.missingGeneratorMessage
  // prisma2.mi
}

async function cleanup() {}

main().catch(console.error).finally(cleanup).catch(console.error)
