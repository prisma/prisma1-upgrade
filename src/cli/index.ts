import { bold, red, gray, underline, green } from "kleur"
import { console } from "../console"
import * as prompt from "../prompt"
import * as p2 from "../prisma2"
import * as p1 from "../prisma1"
import * as sql from "../sql"
import * as api from "../api"
// import prompts from 'prompts'
import redent from "redent"
import isURL from "is-url"
import yaml from "js-yaml"
import path from "path"
import util from "util"
import arg from "arg"
import fs from "fs"

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
  "--chdir": String,
  "-C": "--chdir",

  // url
  "--url": String,
  "-u": "--url",

  // help
  "--help": Boolean,
  "-h": "--help",

  // version
  "--version": Boolean,
  "-v": "--version",
}

function usage() {
  return redent(`
    ${bold("prisma-upgrade")} helps you transition from Prisma 1 to Prisma 2+.

    ${bold("Usage")}

      prisma-upgrade [flags] [path-to-prisma-yml] [path-to-prisma-schema]

    ${bold("Arguments")}

      [path-to-prisma-yml]     Path to prisma.yml file. Defaults to prisma/prisma.yml.
      [path-to-prisma-schema]  Path to schema.prisma file. Defaults to prisma/schema.prisma.

    ${bold("Optional Flags")}

      -u, --url <url>      Connection string to your database.
      -C, --chdir <dir>    Change the working directory.
      -h, --help           Output usage information.
      -v, --version        Show the version.

    ${bold("Examples")}

      ${gray(`# Same as prisma-upgrade prisma/prisma.yml prisma/schema.prisma`)}
      npx prisma-upgrade

      ${gray(`# Specify a custom prisma.yml and schema.prisma path`)}
      npx prisma-upgrade ./prisma.yml ./schema.prisma

      ${gray(`# Specify a Prisma 1 endpoint or connection string`)}
      npx prisma-upgrade --url http://localhost:4467/postgres-env/dev
  `)
}

async function main(argv: string[]): Promise<void> {
  const args = arg(flags, { argv: argv, permissive: true })

  // print help
  if (args["--help"]) {
    console.log(usage())
    return
  }

  // print the version
  if (args["--version"]) {
    console.log(require("../../package.json").version)
    return
  }

  const params = args._.slice(2)
  let prismaYaml = ""
  let schemaPrisma = ""
  switch (params.length) {
    case 0:
      prismaYaml = "prisma/prisma.yml"
      schemaPrisma = "prisma/schema.prisma"
      break
    case 1:
      prismaYaml = params[0]
      schemaPrisma = "prisma/schema.prisma"
      break
    case 2:
      prismaYaml = params[0]
      schemaPrisma = params[1]
      break
    default:
      return fatal(`Too many arguments. Run ${green(`\`npx prisma-upgrade -h\``)} for details.`)
  }

  // change the working directory
  const wd = args["--chdir"] ? path.resolve(cwd, args["--chdir"]) : cwd
  prismaYaml = path.resolve(wd, prismaYaml)
  if (!(await exists(prismaYaml))) {
    return fatal(`prisma.yml doesn't exist in "${prismaYaml}". Run \`prisma-upgrade -h\` for more details.`)
  }
  schemaPrisma = path.resolve(wd, schemaPrisma)
  if (!(await exists(schemaPrisma))) {
    return fatal(`Prisma 2+ schema doesn't exist in "${schemaPrisma}". Run \`prisma-upgrade -h\` for more details.`)
  }

  const yml = yaml.safeLoad(await readFile(prismaYaml, "utf8"))
  if (!yml.endpoint) {
    return fatal(`${bold(`prisma.yml`)} must have an \`endpoint\` parameter`)
  }
  if (!yml.datamodel) {
    return fatal(`${bold(`prisma.yml`)} must have an \`endpoint\` parameter`)
  }

  const datamodel = await concatDatamodels(path.dirname(prismaYaml), yml)
  const prisma1 = p1.parse(datamodel)
  let prisma2: p2.Schema
  try {
    prisma2 = new p2.Schema(await readFile(schemaPrisma, "utf8"))
  } catch (err) {
    return fatal(
      redent(`
      Error parsing the Prisma 2+ file.

      Are you sure "${schemaPrisma}" is a valid Prisma 2+ schema file?

      Run ${green(`\`prisma-upgrade -h\``)} for more details.

      Stack Trace:

        ${redent(err.stack || err.message, 4).trim()}
      `)
    )
  }

  const provider = prisma2.provider()

  // MongoDB is not supported and has a custom upgrade documentation
  if (provider === 'mongodb') {
    return fatal(
      `MongoDB connector is not supported by \`prisma-upgrade\`.`
    )
  }

  const url = isURL(args["--url"] || "") ? args["--url"] : findURL(yml, prisma2)
  if (!url) {
    return fatal(
      redent(`
        We could not determine your endpoint. It's probably in an environment variable.

        Please use the --url flag to specify the endpoint.

        Run ${green(`\`prisma-upgrade -h\``)} for more details.

        Note: The url is not used to connect to your database, only to determine the schema name.
    `)
    )
  }

  // no models
  if (prisma2.models.length === 0) {
    return fatal(
      `Your Prisma 2+ schema doesn't have any models. Run ${green(`\`prisma db pull\``)}, then run ${green(
        `\`prisma-upgrade\``
      )} again.`
    )
  }

  const { ops, schema, breakingOps, idOps } = await api.upgrade({
    prisma1,
    prisma2,
    url,
  })

  if (ops.length || breakingOps.length) {
    console.log(
      redent(`
      ◮ Welcome to the interactive ${bold("Prisma Upgrade CLI")} that helps with the
      upgrade process from Prisma 1 to Prisma 2+.

      Please read the docs to learn more about the upgrade process:
      ${gray(underline("https://pris.ly/d/how-to-upgrade"))}

      ${bold("➤ Goal")}
      The Upgrade CLI helps you resolve the schema incompatibilities
      betweeen Prisma 1 and Prisma 2+. Learn more in the docs:
      ${gray(underline("https://pris.ly/d/schema-incompatibilities"))}

      ${bold("➤ How it works")}
      Troughout the process, you'll need to adjust your database schema by sending
      SQL statements to it. The SQL statements are provided by the Upgrade CLI.

      Note that the Upgrade CLI never makes changes to your database,
      you are in full control over any operations that are executed against it.

      You can stop and re-run the Upgrade CLI at any time.

      These are the different steps of the upgrade processs:

        1. The Upgrade CLI generates SQL commands for you to run on your database.
        2. You run the SQL commands against your database.
        3. You run the ${green(`\`npx prisma db pull\``)} command again.
        4. You run the ${green(`\`npx prisma-upgrade\``)} command again.
        5. Finally the Upgrade CLI adjusts the Prisma 2+ schema by adding missing attributes.

      ${bold("➤ Note")}
      It is recommended that you make a full backup of your existing data before starting
      the upgrade process. If possible, the migration should be performed in a staging
      environment before executed against a production environment.

      ${bold("➤ Help")}
      If you have any questions or run into any problems along the way,
      please create an issue at:
      ${gray(underline("https://github.com/prisma/upgrade/issues/new"))}
    `)
    )
    await confirm(`Are you ready? [Y/n] `)
    clear(true)
  }

  // Non-breaking operations
  const nonBreakingOps = ops.concat(idOps)
  if (nonBreakingOps.length) {
    const segments = new Map<sql.Op["type"], sql.Op[]>()
    for (let op of nonBreakingOps) {
      if (!segments.has(op.type)) {
        segments.set(op.type, [])
      }
      const segment = segments.get(op.type) || []
      segment.push(op)
    }

    console.log(`${bold("➤ Adjust your database schema")}`)
    console.log(`Run the following SQL statements against your database:`)
    console.log()

    // run the queries
    for (let [type, ops] of segments) {
      const queries = sql.translate(provider, ops)
      switch (type) {
        case "SetDefaultOp":
          console.log(`  ${bold(`Add missing \`DEFAULT\` constraints to the database`)}`)
          console.log(
            `  ${gray(`https://pris.ly/d/schema-incompatibilities#default-values-arent-represented-in-database`)}`
          )
          console.log()
          console.log(redent(queries.join("\n"), 4))
          console.log()
          console.log()
          break
        case "SetCreatedAtOp":
          console.log(`  ${bold(`Replicate \`@createdAt\` behavior in Prisma 2+`)}`)
          console.log(`  ${gray(`https://pris.ly/d/schema-incompatibilities#createdat-isnt-represented-in-database`)}`)
          console.log()
          console.log(redent(queries.join("\n"), 4))
          console.log()
          console.log()
          break
        case "AddUniqueConstraintOp":
          console.log(`  ${bold(`Fix 1-1 relations by adding \`UNIQUE\` constraints`)}`)
          console.log(
            `  ${gray(
              `https://pris.ly/d/schema-incompatibilities#inline-1-1-relations-are-recognized-as-1-n-missing-unique-constraint`
            )}`
          )
          console.log()
          console.log(redent(queries.join("\n"), 4))
          console.log()
          console.log()
          break
        case "AlterIDsOp":
          console.log(`  ${bold(`Migrate IDs from varchar(25) to varchar(30)`)}`)
          console.log(`  ${gray(`https://pris.ly/d/schema-incompatibilities#mismatching-cuid-length`)}`)
          console.log()
          console.log(redent(queries.join("\n"), 4))
          console.log()
          console.log()
          break
        case "SetJsonTypeOp":
          console.log(`  ${bold(`Fix columns with JSON data types`)}`)
          console.log(
            `  ${gray(`https://pris.ly/d/schema-incompatibilities#json-type-is-represented-as-text-in-database`)}`
          )
          console.log()
          console.log(redent(queries.join("\n"), 4))
          console.log()
          console.log()
          break
        case "SetEnumTypeOp":
          console.log(`  ${bold(`Fix columns with ENUM data types`)}`)
          console.log(
            `  ${gray(`https://pris.ly/d/schema-incompatibilities#enums-are-represented-as-text-in-database`)}`
          )
          console.log()
          console.log(redent(queries.join("\n"), 4))
          console.log()
          console.log()
          break
      }
    }
  }

  if (breakingOps.length) {
    const segments = new Map<sql.Op["type"], sql.Op[]>()
    for (let op of breakingOps) {
      if (!segments.has(op.type)) {
        segments.set(op.type, [])
      }
      const segment = segments.get(op.type) || []
      segment.push(op)
    }

    console.log(
      redent(`
        ${bold("➤ Breaking changes detected")}

        In order to fully optimize your database schema, you'll need to run a few SQL
        statements that will break your Prisma 1 setup. Note that these changes are optional
        and if you are upgrading gradually and running Prisma 1 and Prisma 2+ side-by-side,
        you should not perform these changes yet. Instead, you can perform them whenever
        you are ready to completely remove Prisma 1 from your project.
        If you are upgrading all at once, you can safely perform these changes now.

        Learn more in the docs:
        ${gray(underline("https://pris.ly/d/how-to-upgrade"))}
      `)
    )
    const yes = await prompt.confirm(`Do you want to view the breaking SQL statements now? [Y/n]? `)
    if (yes) {
      clear(true)

      console.log(`${bold("➤ Adjust your database schema (these changes break Prisma 1)")}`)
      console.log(`Run the following SQL statements against your database:`)
      console.log()

      // run the queries
      for (let [type, ops] of segments) {
        const queries = sql.translate(provider, ops)
        switch (type) {
          case "MigrateHasManyOp":
            console.log(`  ${bold(`Fix one-to-many table relations`)}`)
            console.log(
              `  ${gray(`https://pris.ly/d/schema-incompatibilities#all-non-inline-relations-are-recognized-as-m-n`)}`
            )
            console.log()
            console.log(redent(queries.join("\n"), 4))
            console.log()
            console.log()
            break
          case "MigrateOneToOneTableOp":
            console.log(`  ${bold(`Fix one-to-one table relations`)}`)
            console.log(
              `  ${gray(`https://pris.ly/d/schema-incompatibilities#all-non-inline-relations-are-recognized-as-m-n`)}`
            )
            console.log()
            console.log(redent(queries.join("\n"), 4))
            console.log()
            console.log()
            break
          case "MigrateEnumListOp":
            console.log(`  ${bold(`Fix enum lists`)}`)
            console.log()
            console.log(redent(queries.join("\n"), 4))
            console.log()
            console.log()
            break
          case "MigrateScalarListOp":
            console.log(`  ${bold(`Fix simple scalar lists`)}`)
            console.log()
            console.log(redent(queries.join("\n"), 4))
            console.log()
            console.log()
            break
          case "SetJsonTypeOp":
            console.log(`  ${bold(`Fix columns with JSON data types`)}`)
            console.log(
              `  ${gray(`https://pris.ly/d/schema-incompatibilities#json-type-is-represented-as-text-in-database`)}`
            )
            console.log()
            console.log(redent(queries.join("\n"), 4))
            console.log()
            console.log()
            break
          case "SetEnumTypeOp":
            console.log(`  ${bold(`Fix columns with ENUM data types`)}`)
            console.log(
              `  ${gray(`https://pris.ly/d/schema-incompatibilities#enums-are-represented-as-text-in-database`)}`
            )
            console.log()
            console.log(redent(queries.join("\n"), 4))
            console.log()
            console.log()
            break
        }
      }
    }
  }

  console.log(
    redent(`
      ${bold("➤ Next Steps")}

      After you executed one or more of the previous SQL statements against your database,
      please run the following two commands to refresh your Prisma 2+ schema and check
      the changes.

        1. Run ${green(`\`npx prisma db pull\``)} again to refresh your Prisma 2+ schema.
        2. Run ${green(`\`npx prisma-upgrade\``)} again.

      If you can't or don't want to execute the remaining SQL statements right now, you can
      skip to the last step where the Upgrade CLI adds missing attributes to your Prisma 2+
      schema that are not picked up by introspection.
    `)
  )
  const yes = await prompt.confirm(`Skip to the last step? [Y/n]? `)
  if (!yes) {
    return
  }
  clear(true)

  // overwrite the schema.prisma file if there's no remaining operations
  console.log(
    redent(`
      ${bold("➤ What happens next")}
      As a last step, some final adjustments will be made to your Prisma 2+ schema
      to carry over some Prisma-level attributes that aren't picked up by introspection.

      ${bold("Warning")}
      Your current Prisma 2+ schema will be overwritten, so please
      make sure you have a backup!
  `)
  )
  await confirm(`Are you ready? [Y/n] `)
  clear(true)
  console.log()
  const relpath = path.relative(process.cwd(), schemaPrisma)
  console.log(`Updating ${bold(gray(relpath))}...`)
  await writeFile(schemaPrisma, schema.toString())
  console.log(`Done updating ${bold(gray(relpath))}!`)
  console.log(
    redent(`
      ${bold(`✔ Congratulations, you're all set!`)}

      ${bold("➤ Note")}
      If you didn't execute all generated SQL commands against your database,
      you can re-run the Upgrade CLI at any time.

      Note that the Upgrade CLI doesn't resolve all of the schema incompatibilities
      between Prisma 1 and Prisma 2+. If you want to resolve the remaining ones,
      you can do so manually by following this guide:
      ${gray(underline(`https://pris.ly/d/upgrading-the-prisma-layer`))}

      ${bold("➤ Next steps")}
      Otherwise you can continue your upgrade process by installing Prisma Client 2:
      ${green(`npm install @prisma/client`)}

      You can find guides for different upgrade scenarios in the docs:
      ${gray(underline(`https://pris.ly/d/upgrade-from-prisma-1`))}
  `)
  )
  return
}

/**
 * Concatenate all the datamodels together
 */

async function concatDatamodels(wd: string, yml: any): Promise<string> {
  if (!("datamodel" in yml)) {
    return ""
  }
  const datamodels = [].concat(yml.datamodel)
  const models: string[] = []
  for (let dm of datamodels) {
    models.push(await readFile(path.join(wd, dm), "utf8"))
  }
  return models.join("\n\n")
}

/**
 * Find the URL from prisma.yml or prisma 2 schema
 */

function findURL(yml: any, p2: p2.Schema): string | void {
  if (isURL(yml.endpoint)) {
    return yml.endpoint
  }
  const url = p2.url() || ""
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
  process.stdout.write(isSoft ? "\x1B[H\x1B[2J" : "\x1B[2J\x1B[3J\x1B[H\x1Bc")
}

/**
 * Run main
 */

main(process.argv).catch((err) => {
  fatal(err.message)
  process.exit(1)
})
