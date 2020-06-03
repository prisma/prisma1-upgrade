import { bold, red, gray } from 'kleur'
import { console } from '../console'
import * as prompt from '../prompt'
import * as p2 from '../prisma2'
import * as p1 from '../prisma1'
import * as sql from '../sql'
import * as api from '../api'
// import prompts from 'prompts'
import redent from 'redent'
import isURL from 'is-url'
import yaml from 'js-yaml'
import path from 'path'
import util from 'util'
import arg from 'arg'
import fs from 'fs'

/**
 * Constants
 */

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)
const exists = util.promisify(fs.exists)
const cwd = process.cwd()

/**
 * Flags
 */

const flags = {
  // chdir
  '--chdir': String,
  '-C': '--chdir',

  // help
  '--url': String,
  '-u': '--url',

  // help
  '--help': Boolean,
  '-h': '--help',

  // version
  '--version': Boolean,
}

function usage() {
  return redent(`
    ${bold('prisma-upgrade')} helps you transition from Prisma 1 to Prisma 2.

    ${bold('Usage')}

      prisma-upgrade [flags] [path-to-prisma-yml] [path-to-prisma-schema]

    ${bold('Arguments')}

      [path-to-prisma-yml]     Path to prisma.yml file. Defaults to prisma/prisma.yml.
      [path-to-prisma-schema]  Path to schema.prisma file. Defaults to prisma/schema.prisma.

    ${bold('Optional Flags')}

      -u, --url <url>      Connection string to your database.
      -C, --chdir <dir>    Change the working directory.
      -h, --help           Output usage information.
          --version        Show the version.

    ${bold('Examples')}

      ${gray(`# Same as prisma-upgrade prisma/prisma.yml prisma/schema.prisma`)}
      npx prisma-upgrade

      ${gray(`# Specify a custom prisma.yml and schema.prisma path`)}
      npx prisma-upgrade ./prisma.yml ./prisma.schema

      ${gray(`# Specify a Prisma 1 endpoint or connection string`)}
      npx prisma-upgrade --url http://localhost:4467/postgres-env/dev
  `)
}

async function main(argv: string[]): Promise<void> {
  const args = arg(flags, { argv: argv, permissive: true })

  // print help
  if (args['--help']) {
    console.log(usage())
    return
  }

  // print the version
  if (args['--version']) {
    console.log(require('../package.json').version)
    return
  }

  const params = args._.slice(2)
  let prismaYaml = ''
  let schemaPrisma = ''
  switch (params.length) {
    case 0:
      prismaYaml = 'prisma/prisma.yml'
      schemaPrisma = 'prisma/schema.prisma'
      break
    case 1:
      prismaYaml = params[0]
      schemaPrisma = 'prisma/schema.prisma'
      break
    case 2:
      prismaYaml = params[0]
      schemaPrisma = params[1]
      break
    default:
      fatal('Too many arguments.')
      process.exit(1)
  }

  // change the working directory
  const wd = args['--chdir'] ? path.resolve(cwd, args['--chdir']) : cwd
  prismaYaml = path.resolve(wd, prismaYaml)
  if (!(await exists(prismaYaml))) {
    fatal(`Prisma 1 datamodel doesn't exist in "${prismaYaml}"`)
    process.exit(1)
  }
  schemaPrisma = path.resolve(wd, schemaPrisma)
  if (!(await exists(schemaPrisma))) {
    fatal(`Prisma 2 schema doesn't exist in "${schemaPrisma}"`)
    process.exit(1)
  }

  const yml = yaml.safeLoad(await readFile(prismaYaml, 'utf8'))
  if (!yml.endpoint) {
    fatal(`prisma.yml must have an endpoint parameter`)
    process.exit(1)
  }
  if (!yml.datamodel) {
    fatal(`prisma.yml must have an datamodel parameter`)
    process.exit(1)
  }

  const datamodel = await concatDatamodels(path.dirname(prismaYaml), yml)
  const prisma1 = p1.parse(datamodel)
  const prisma2 = new p2.Schema(await readFile(schemaPrisma, 'utf8'))
  const url = isURL(args['--url'] || '') ? args['--url'] : findURL(yml, prisma2)
  if (!url) {
    fatal(
      `No url found. Please use the --url flag. We don't use this url to connect to your database, only to determine the schema name.`
    )
    process.exit(1)
  }

  const { ops, schema } = await api.upgrade({
    prisma1,
    prisma2,
    url,
  })

  if (ops.length) {
    const provider = prisma2.provider()

    const segments = new Map<sql.Op['type'], sql.Op[]>()
    for (let op of ops) {
      if (!segments.has(op.type)) {
        segments.set(op.type, [])
      }
      const segment = segments.get(op.type) || []
      segment.push(op)
    }

    console.log(
      redent(`
      Welcome to the Prisma 1 to Prisma 2 upgrade tool. This tool is designed
      to help you gracefully transition your ${provider} database from Prisma 1
      to Prisma 2.

      Here's how it works:

        1. We inspect the contents of your Prisma 1 and Prisma 2 files.
        2. We generate specific SQL commands for you to run on your database.
        3. You run the SQL commands against your database
        4. You run the \`prisma introspect\` command again
        5. You run the \`prisma-upgrade\` tool again
        6. We check the Prisma 2 schema to ensure everything has been applied
        7. We upgrade the Prisma 2 schema with Prisma-level attributes

      We will not try to migrate your database for you. You are in full control
      over the changes to your ${provider} database.

      We suggest you first run the subsequent SQL commands on your testing or
      staging ${provider} database. Then when you're confident with the
      transition you can migrate your production database. We encourage you to
      backup your database before performing any of these actions.

      If you have any questions or run into any problems along the way,
      please create an issue at https://github.com/prisma/upgrade/issues/new.
    `)
    )
    await confirm(`Are you ready? [Y/n] `)

    console.log()
    console.log(
      `2. We've generated the following commands to be run on your database.`
    )
    console.log()

    // run the queries
    for (let [type, ops] of segments) {
      const queries = sql.translate(provider, ops)
      switch (type) {
        case 'SetDefaultOp':
          console.log(`  Move Prisma-level @default values into the database.`)
          console.log()
          console.log('    ' + queries.join('\n    '))
          console.log()
          break
        case 'SetCreatedAtOp':
          console.log(
            `  Move Prisma-level @createdAt as a default expression in the database.`
          )
          console.log()
          console.log('    ' + queries.join('\n    '))
          console.log()
          break
        case 'AddUniqueConstraintOp':
          console.log(`  Apply a unique constraint to one-to-one relations.`)
          console.log()
          console.log('    ' + queries.join('\n    '))
          console.log()
          break
        case 'SetJsonTypeOp':
          console.log(
            `  Turn the columns string type into a json type for Json fields.`
          )
          console.log()
          console.log('    ' + queries.join('\n    '))
          console.log()
          break
      }
    }

    console.log(`3. Run the above SQL commands against your database`)
    console.log(
      `4. Run \`prisma introspect\` again to refresh your Prisma 2 schema`
    )
    console.log(`5. Run \`prisma-upgrade\` again`)
    console.log()
    return
  }

  // overwrite the schema.prisma file if there's no remaining operations
  console.log(
    redent(`
      Congrats! You've fully upgraded your Prisma Schema.

      As a last step, we need to adjust your Prisma 2 schema
      to carry-over some Prisma-level attributes that aren't
      picked up by introspection.

      We will overwrite your existing Prisma 2 schema so please
      make sure you have a backup.
  `)
  )
  await confirm(`Are you ready? [Y/n] `)
  console.log()
  const relpath = path.relative(process.cwd(), schemaPrisma)
  console.log(`  Updating ${relpath}...`)
  await writeFile(schemaPrisma, schema.toString())
  console.log(`  Updated ${relpath}.`)
  console.log(
    redent(`
      You're all set!

      Please diff your backup to make sure the adjustments match your
      expectations.

      As always, if you have any questions or concerns you can find us
      in Slack at https://prisma.slack.com.

      Happy data modeling!
  `)
  )
  return
}

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

function findURL(yml: any, p2: p2.Schema): string | void {
  if (isURL(yml.endpoint)) {
    return yml.endpoint
  }
  const url = p2.url() || ''
  if (isURL(url)) {
    return url
  }
  return
}

async function confirm(message: string): Promise<void> {
  const yes = await prompt.confirm(message)
  if (!yes) {
    process.exit(0)
  }
}

function fatal(message: string) {
  console.error(
    `\n${red(
      `${bold(`Error`)} ${redent(message).trim()}`
    )}\n${usage()}\nIf you have any questions or run into any problems along the way, please create an issue at https://github.com/prisma/upgrade/issues/new.`
  )
}

/**
 * Run main
 */

main(process.argv).catch((err) => {
  fatal(err.message)
  process.exit(1)
})
