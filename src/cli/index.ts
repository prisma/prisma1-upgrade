import { console } from '../console'
import * as p2 from '../prisma2'
import * as p1 from '../prisma1'
import * as sql from '../sql'
import * as api from '../api'
import { bold } from 'kleur'
import yaml from 'js-yaml'
import path from 'path'
import util from 'util'
import url from 'url'
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
  '--help': Boolean,
  '-h': '--help',

  // version
  '--version': Boolean,
}

function usage() {
  return `
  ${bold('prisma-upgrade')} helps you transition from Prisma 1 to Prisma 2.

  ${bold('Usage')}

    prisma-upgrade [flags] [path-to-prisma-yml] [path-to-prisma-schema]

  ${bold('Arguments')}

    [path-to-prisma-yml]     Path to prisma.yml file. Defaults to prisma/prisma.yml.
    [path-to-prisma-schema]  Path to schema.prisma file. Defaults to prisma/schema.prisma.

  ${bold('Flags')}

    -C, --chdir          Change the working directory.
    -h, --help           Output usage information.
        --version        Show the version.
  `
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
      console.error(usage())
      process.exit(1)
  }

  // change the working directory
  const wd = args['--chdir'] ? path.resolve(cwd, args['--chdir']) : cwd
  prismaYaml = path.resolve(wd, prismaYaml)
  if (!(await exists(prismaYaml))) {
    console.error(
      `[!] Prisma 1 Datamodel doesn't exist "${prismaYaml}"\n\n${usage()}`
    )
    process.exit(1)
  }
  schemaPrisma = path.resolve(wd, schemaPrisma)
  if (!(await exists(schemaPrisma))) {
    console.error(
      `[!] Prisma 2 Schema doesn't exist "${schemaPrisma}"\n\n${usage()}`
    )
    process.exit(1)
  }

  const yml = yaml.safeLoad(await readFile(prismaYaml, 'utf8'))
  if (!yml.endpoint) {
    throw new Error(`prisma.yml must have an endpoint parameter`)
  }
  if (!yml.datamodel) {
    throw new Error(`prisma.yml must have an datamodel parameter`)
  }
  const datamodel = await concatDatamodels(path.dirname(prismaYaml), yml)
  const pathname = url.parse(yml.endpoint).pathname || ''
  const schemaName = pathname.slice(1)
    ? pathname.slice(1).replace(/\//g, '$')
    : 'default$default'
  const prisma1 = p1.parse(datamodel)
  const prisma2 = new p2.Schema(await readFile(schemaPrisma, 'utf8'))

  const { ops, schema } = await api.upgrade({
    pgschema: schemaName,
    prisma1,
    prisma2,
  })

  if (ops.length) {
    const queries = sql.translate(schema.provider(), ops)
    console.log('1. Please run the following commands on your database')
    console.log()
    // run the queries
    for (let query of queries) {
      console.log('    ' + query)
    }
    console.log()
    console.log(`2. Run prisma introspect again`)
    console.log(`3. Run prisma-upgrade one more time`)

    return
  }

  // overwrite the schema.prisma file if there's no remaining operations
  await writeFile(schemaPrisma, schema.toString())
  console.log(`You're all set! `)
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

/**
 * Run main
 */

main(process.argv).catch((err) => {
  console.error(err)
  process.exit(1)
})
