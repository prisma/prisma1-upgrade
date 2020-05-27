import { console } from '../console'
import * as p2 from '../prisma2'
import * as p1 from '../prisma1'
import * as sql from '../sql'
import * as api from '../api'
import { bold } from 'kleur'
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
  '--help': Boolean,
  '-h': '--help',

  // version
  '--version': Boolean,
}

function usage() {
  return `
  ${bold('prisma-upgrade')} helps you transition from Prisma 1 to Prisma 2.

  ${bold('Usage')}

    prisma-upgrade [flags] <datamodel.graphql> <schema.prisma>

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
  if (params.length < 2) {
    console.error(usage())
    process.exit(1)
  }

  // change the working directory
  const wd = args['--chdir'] ? path.resolve(cwd, args['--chdir']) : cwd
  const p1path = path.resolve(wd, params[0])
  if (!(await exists(p1path))) {
    console.error(
      `[!] Prisma 1 Datamodel doesn't exist "${p1path}"\n\n${usage()}`
    )
    process.exit(1)
  }
  const p2path = path.resolve(wd, params[1])
  if (!(await exists(p2path))) {
    console.error(`[!] Prisma 2 Schema doesn't exist "${p2path}"\n\n${usage()}`)
    process.exit(1)
  }

  const prisma1 = p1.parse(await readFile(p1path, 'utf8'))
  const p2schema = await readFile(p2path, 'utf8')
  const prisma2 = new p2.Schema(p2schema)

  const { ops, schema } = await api.upgrade({
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

  await writeFile(params[1], schema.toString())
  console.log(`You're all set! `)
  return
}

// function bak(p: string): string {
//   const ext = path.extname(p)
//   return path.join(path.dirname(p), path.basename(p, ext) + '.bak' + ext)
// }

/**
 * Run main
 */

main(process.argv).catch((err) => {
  console.error(err)
  process.exit(1)
})
