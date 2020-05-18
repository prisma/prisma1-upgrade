import { Prompt } from '../prompter'
import { console } from '../console'
import { print } from 'prismafile'
import * as api from '../api'
import { bold } from 'kleur'
import P1 from '../prisma1'
import P2 from '../prisma2'
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
  const p1 = path.resolve(wd, params[0])
  if (!(await exists(p1))) {
    console.error(`[!] Prisma 1 Datamodel doesn't exist "${p1}"\n\n${usage()}`)
    process.exit(1)
  }
  const p2 = path.resolve(wd, params[1])
  if (!(await exists(p2))) {
    console.error(`[!] Prisma 2 Schema doesn't exist "${p2}"\n\n${usage()}`)
    process.exit(1)
  }

  const prisma1 = P1.parse(await readFile(p1, 'utf8'))
  const prisma2String = await readFile(p2, 'utf8')
  const prisma2 = P2.parse(prisma2String)

  // TODO: remove mock
  const inspector: api.Inspector = {
    introspect(_schema: string): Promise<{ datamodel: string }> {
      return Promise.resolve({ datamodel: prisma2String })
    },
  }

  const prompter = new Prompt()

  const schema = await api.upgrade({
    prompter: prompter,
    console: console,
    prisma1,
    prisma2,
    inspector,
  })

  const schemaFile = print(schema)
  const { overwrite } = await prompter.prompt({
    name: 'overwrite',
    type: 'confirm',
    message: `
      We've made a few last adjustments to your prisma.schema file.

      Would you like to override ${params[1]}?`,
  })
  const outfile = overwrite ? params[1] : bak(params[1])
  await writeFile(outfile, schemaFile)
  return
}

function bak(p: string): string {
  const ext = path.extname(p)
  return path.join(path.dirname(p), path.basename(p, ext) + '.bak' + ext)
}

/**
 * Run main
 */

main(process.argv).catch((err) => {
  console.error(err)
  process.exit(1)
})
