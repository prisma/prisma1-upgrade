import { bold, red, gray, underline, black, green } from 'kleur'
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
    return fatal(`prisma.yml doesn't exist in "${prismaYaml}"`)
  }
  schemaPrisma = path.resolve(wd, schemaPrisma)
  if (!(await exists(schemaPrisma))) {
    return fatal(`Prisma 2.0 schema doesn't exist in "${schemaPrisma}"`)
  }

  const yml = yaml.safeLoad(await readFile(prismaYaml, 'utf8'))
  if (!yml.endpoint) {
    return fatal(`prisma.yml must have an \`endpoint\` parameter`)
  }
  if (!yml.datamodel) {
    return fatal(`prisma.yml must have an \`endpoint\` parameter`)
  }

  const datamodel = await concatDatamodels(path.dirname(prismaYaml), yml)
  const prisma1 = p1.parse(datamodel)
  const prisma2 = new p2.Schema(await readFile(schemaPrisma, 'utf8'))
  const url = isURL(args['--url'] || '') ? args['--url'] : findURL(yml, prisma2)
  if (!url) {
    return fatal(
      `No url found. Please use the --url flag. The url is not used to connect to your database, only to determine the schema name. Run \`prisma-upgrade -h\` for more details.`
    )
  }
  // no models
  if (prisma2.models.length === 0) {
    return fatal(
      `Your Prisma 2.0 schema doesn't have any models. Run \`prisma introspect\`, then run \`prisma-upgrade\`  again.`
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
      ◮ Welcome to the interactive Prisma Upgrade CLI that helps with the 
      upgrade process from Prisma 1 to Prisma 2.0.

      Please read the docs to learn more about the upgrade process:
      ${gray(underline('https://pris.ly/d/how-to-upgrade'))}

      ${bold('➤ Goal')}
      The Upgrade CLI helps you resolve the schema incompatibilities 
      betweeen Prisma 1 and Prisma 2.0. Learn more in the docs: 
      ${gray(underline('https://pris.ly/d/schema-incompatibilities'))}

      ${bold('➤ How it works')}
      Troughout the process, you'll need to adjust your database schema by sending
      SQL statements to it. The SQL statements are provided by the Upgrade CLI. 

      Note that the Upgrade CLI never makes changes to your database, 
      you are in full control over any operations that are executed against it.

      You can stop and re-run the Upgrade CLI at any time.

      These are the different steps of the upgrade processs:
    
        1. The Upgrade CLI generates SQL commands for you to run on your database.
        2. You run the SQL commands against your database.
        3. You run the ${green(`\`prisma introspect\``)} command again.
        4. You run the ${green(`\`prisma-upgrade\``)} command again.
        5. The Upgrade CLI adjusts the Prisma 2.0 schema by adding missing attributes.

      ${bold('➤ Note')}
      It is recommended that you make a full backup of your existing data before starting 
      the upgrade process. If possible, the migration should be performed in a staging 
      environment before executed against a production environment.

      ${bold('➤ Help')}
      If you have any questions or run into any problems along the way,
      please create an issue at:
      ${gray(underline('https://github.com/prisma/upgrade/issues/new'))}
    `)
    )
    await confirm(`Are you ready? [Y/n] `)
    clear(true)

    console.log()
    console.log(
      `Run the following SQL statements against your database:`
    )
    console.log()

    // run the queries
    for (let [type, ops] of segments) {
      const queries = sql.translate(provider, ops)
      switch (type) {
        case 'SetDefaultOp':
          console.log(`  ${bold(`Add missing \`DEFAULT\` constraints to the database`)}`)
          console.log(`  ${gray(`https://pris.ly/d/schema-incompatibilities#default-values-arent-represented-in-database`)}`)
          console.log()
          console.log('    ' + queries.join('\n    '))
          console.log()
          break
        case 'SetCreatedAtOp':
          console.log(`  ${bold(`Replicate \`@createdAt\` behavior in Prisma 2.0`)}`)
          console.log(`  ${gray(`https://pris.ly/d/schema-incompatibilities#createdat-isnt-represented-in-database`)}`)
          console.log()
          console.log('    ' + queries.join('\n    '))
          console.log()
          break
        case 'AddUniqueConstraintOp':
          console.log(`  ${bold(`Fix 1-1 relations by adding \`UNIQUE\` constraints`)}`)
          console.log(`  ${gray(`https://pris.ly/d/schema-incompatibilities#inline-1-1-relations-are-recognized-as-1-n-missing-unique-constraint`)}`)
          console.log()
          console.log('    ' + queries.join('\n    '))
          console.log()
          break
        case 'SetJsonTypeOp':
          console.log(`  ${bold(`Fixing columns with JSON data types`)}`)
          console.log(`  ${gray(`https://pris.ly/d/schema-incompatibilities##json-type-is-represented-as-text-in-database`)}`)
          console.log()
          console.log('    ' + queries.join('\n    '))
          console.log()
          break
        case 'SetEnumTypeOp':
          console.log(
            `  Turn the columns string type into a enum type for Enum fields.`
          )
          console.log()
          console.log('    ' + queries.join('\n    '))
          console.log()
          break
      }
    }

    console.log(
      redent(`
      If you've made all the SQL changes you're comfortable with,
      you can skip to the end where the Upgrade CLI makes some final
      adjustments to your Prisma 2.0 schema.

      Otherwise the next steps are to:

        1. Run ${green(`\`prisma introspect\``)} again to refresh your Prisma 2.0 schema.
        2. Run ${green(`\`prisma-upgrade\``)} again.
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
      Congratulations! You've fully upgraded your Prisma schema.

      As a last step, some final adjustments will be made to your Prisma 2.0 
      schema to carry over some Prisma-level attributes that aren't picked 
      up by introspection.

      ${bold('Warning')}
      Your current Prisma 2.0 schema will be overwritten, so please
      make sure you have a backup!
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
      ✔ You're all set!

      ${bold('Notes')}
      The Upgrade CLI doesn't resolve all of the schema incompatibilities.
      If you want to resolve the remaining ones, you can follow this guide:
      https://pris.ly/d/upgrading-the-prisma-layer

      ${bold('Next steps')}
      You can continue your upgrade process by installing Prisma Client 2.0:
      npm install @prisma/client

      You can find guides for different upgrade scenarios in the docs:
      https://pris.ly/d/upgrade-from-prisma-1
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
