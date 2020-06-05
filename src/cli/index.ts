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
  '-v': '--version',
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
      -v, --version        Show the version.

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
    console.log(require('../../package.json').version)
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
      return fatal('Too many arguments. Run `prisma-upgrade -h` for details.')
  }

  // change the working directory
  const wd = args['--chdir'] ? path.resolve(cwd, args['--chdir']) : cwd
  prismaYaml = path.resolve(wd, prismaYaml)
  if (!(await exists(prismaYaml))) {
    return fatal(`Prisma 1 datamodel doesn't exist in "${prismaYaml}"`)
  }
  schemaPrisma = path.resolve(wd, schemaPrisma)
  if (!(await exists(schemaPrisma))) {
    return fatal(`Prisma 2.0 schema doesn't exist in "${schemaPrisma}"`)
  }

  const yml = yaml.safeLoad(await readFile(prismaYaml, 'utf8'))
  if (!yml.endpoint) {
    return fatal(`prisma.yml must have an endpoint parameter`)
  }
  if (!yml.datamodel) {
    return fatal(`prisma.yml must have an datamodel parameter`)
  }

  const datamodel = await concatDatamodels(path.dirname(prismaYaml), yml)
  const prisma1 = p1.parse(datamodel)
  const prisma2 = new p2.Schema(await readFile(schemaPrisma, 'utf8'))
  const url = isURL(args['--url'] || '') ? args['--url'] : findURL(yml, prisma2)
  if (!url) {
    return fatal(
      `No url found. Please use the --url flag. We don't use this url to connect to your database, only to determine the schema name. Run \`prisma-upgrade -h\` for more details.`
    )
  }
  // no models
  if (prisma2.models.length === 0) {
    return fatal(
      `Your Prisma 2.0 schema doesn't have any models. Run \`prisma introspect\`, then run this tool again.`
    )
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
      Welcome to the interactive Prisma Upgrade CLI that helps 
      with the upgrade process from Prisma 1 to Prisma 2.0.

      Please read the docs to learn more about the upgrade process:
      https://pris.ly/d/how-to-upgrade'

      ${bold('Goal')}
      The Upgrade CLI helps you resolve the schema incompatibilities 
      betweeen Prisma 1 and Prisma 2. Learn more: 
      https://pris.ly/d/schema-incompatibilities

      ${bold('How it works')}
      Troughout the process, you'll need to adjust your database schema by sending
      SQL statements to it. The SQL statements are provided by the Upgrade CLI. 

      Note that the Upgrade CLI never makes changes to your database, 
      you are in full control over any operations that are executed against it.

      These are the different steps of the upgrade processs:
    
        1. The Upgrade CLI inspects the contents of your Prisma 1 and Prisma 2.0 files.
        2. The Upgrade CLI generates specific SQL commands for you to run on your database.
        3. You run the SQL commands against your database.
        4. You run the \`prisma introspect\` command again.
        5. You run the \`prisma-upgrade\` tool again.
        6. The Upgrade CLI checks the Prisma 2.0 schema to ensure everything has been applied.
        7. The Upgrade CLI adjusts the Prisma 2.0 schema with the missing Prisma 2.0 attributes.

      ${bold('Warning')}
      It is recommended that youmake a full backup of your existing data before starting 
      the upgrade process. If possible, the migration should be performed in a staging 
      environment before executed against a production environment.

      ${bold('Help')}
      If you have any questions or run into any problems along the way,
      please create an issue at:
      https://github.com/prisma/upgrade/issues/new.
    `)
    )
    await confirm(`Are you ready? [Y/n] `)
    clear(true)

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
      redent(`
      If you've made all the SQL changes you're comfortable with
      you can skip to the end where we upgrade your Prisma 2.0 schema.

      Otherwise the next steps are to:

        4. Run \`prisma introspect\` again to refresh your Prisma 2.0 schema
        5. Run \`prisma-upgrade\` again
    `)
    )
    const yes = await prompt.confirm(`Skip to the last step? [Y/n]? `)
    if (!yes) {
      return
    }
    clear(true)
  }

  // overwrite the schema.prisma file if there's no remaining operations
  console.log(
    redent(`
      Congrats! You've fully upgraded your Prisma Schema.

      As a last step, we need to adjust your Prisma 2.0 schema
      to carry-over some Prisma-level attributes that aren't
      picked up by introspection.

      We will overwrite your existing Prisma 2.0 schema so please
      make sure you have a backup.
  `)
  )
  await confirm(`Are you ready? [Y/n] `)
  clear(true)
  console.log()
  const relpath = path.relative(process.cwd(), schemaPrisma)
  console.log(`Updating ${relpath}...`)
  await writeFile(schemaPrisma, schema.toString())
  console.log(`Updated ${relpath}.`)
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

/**
 * Concatenate all the datamodels together
 */

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

/**
 * Find the URL from prisma.yml or prisma 2.0 schema
 */

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

/**
 * Confirm or exit
 */

async function confirm(message: string): Promise<void> {
  const yes = await prompt.confirm(message)
  if (!yes) {
    process.exit(0)
  }
}

/**
 * Fatal message and exit
 */

function fatal(message: string) {
  console.error(
    `\n${red(
      `${bold(`Error`)} ${redent(message).trim()}`
    )}\n\nIf you have any questions or run into any problems along the way, please create an issue at https://github.com/prisma/upgrade/issues/new.\n`
  )
  process.exit(1)
}

/**
 * Clear the console. Optionally maintain scrollback
 */

function clear(isSoft: boolean): void {
  process.stdout.write(isSoft ? '\x1B[H\x1B[2J' : '\x1B[2J\x1B[3J\x1B[H\x1Bc')
}

/**
 * Run main
 */

main(process.argv).catch((err) => {
  fatal(err.message)
  process.exit(1)
})
