import { bold } from 'kleur'
import P1 from './p1'
import P2 from './p2'
import arg from 'arg'

const flags = {
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

    prisma-upgrade [flags] <datamodel.prisma> <schema.prisma>

  ${bold('Flags')}

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

  return
}

/**
 * Run main
 */

main(process.argv).catch((err) => {
  console.error(err)
  process.exit(1)
})
