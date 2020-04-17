import { Console } from '../console'
import { Prompter } from '../prompter'
import Prisma1 from '../prisma1'
import Prisma2 from '../prisma2'
import printPG from '../sql/postgres'
import printMS from '../sql/mysql'
import * as sql from '../sql'
import redent from 'redent'

type UpgradeInput = {
  console: Console
  prompter: Prompter
  prisma1: Prisma1
  prisma2: Prisma2
}

function unsupported(msg: string): Error {
  return new Error(msg)
}

// upgrade performs a set of rules
export async function upgrade(input: UpgradeInput): Promise<void> {
  const { console, prompter, prisma1, prisma2 } = input

  // get the datasource
  const datasource = prisma2.datasources[0]
  if (!datasource) {
    throw unsupported(
      'The Prisma 2 schema must contain a datasource configuration'
    )
  }

  // find the prisma2 datasource provider
  const provider = datasource.provider
  if (!provider) {
    throw unsupported('The Prisma 2 datasource must contain a provider')
  }

  // before we get started, check that we have a supported sql dialect
  let print: ((ops: sql.Stmt[]) => string) | undefined
  switch (provider) {
    case 'mysql':
      print = printMS
      break
    case 'postgres':
    case 'postgresql':
      print = printPG
      break
    default:
      throw unsupported(`unsupported provider "${provider}"`)
  }

  console.log(
    redent(`
      Welcome to the Prisma 1 to Prisma 2 upgrade tool.

      This tool is designed to help you gracefully transition your ${provider} database from Prisma 1 to Prisma 2.

      This is how it works:

        1. We inspect the contents of your Prisma 1 datamodel file.
        2. We generate SQL commands for you to run on your database.
        3. We ask you to re-introspect your database to get a new Prisma 2 Schema.

      We will not execute any SQL commands for you automatically, you are in full control
      over the changes to your ${provider} database.

      We suggest you first run the following SQL commands on your testing or staging ${provider} database.
      Then when you're confident with the transition you can migrate your production database.

      If you have any questions along the way, please reach out to hi@prisma.io.
    `)
  )

  let result = await prompter.prompt({
    name: 'welcome',
    type: 'confirm',
    message: `Are you ready to get started?`,
  })
  if (!result.welcome) {
    return
  }

  let stmts: sql.Stmt[] = []
  // upgrade the defaults
  const models = prisma1.objects
  for (let model of models) {
    const fields = model.fields
    for (let field of fields) {
      for (let directive of field.directives) {
        // skip anything but @default
        if (directive.name !== 'default') {
          continue
        }
        const arg = directive.arguments.find((arg) => arg.name === 'value')
        if (!arg) {
          continue
        }
        let literal: sql.Literal | undefined
        const value = arg.value
        switch (value.kind) {
          case 'BooleanValue':
            literal = {
              type: 'boolean_literal',
              value: value.value,
            }
            break
          case 'EnumValue':
            throw unsupported(
              `${model.name}.${field.name} with a @default(value: ${value.value}) is not supported.`
            )
          case 'IntValue':
          case 'FloatValue':
            literal = {
              type: 'numeric_literal',
              value: value.value,
            }
            break
          case 'ListValue':
            throw unsupported(
              `${model.name}.${field.name} with a @default(value: ${value.value}) is not supported.`
            )
          case 'ObjectValue':
            throw unsupported(
              `${model.name}.${field.name} with a @default(value: ${value.value}) is not supported.`
            )
          case 'NullValue':
            throw unsupported(
              `${model.name}.${field.name} with a @default(value: ${value.value}) is not supported.`
            )
          case 'StringValue':
            literal = {
              type: 'string_literal',
              value: value.value,
            }
            break
          case 'Variable':
            throw unsupported(
              `${model.name}.${field.name} with a @default(value: ${value.name}) is not supported.`
            )
        }
        // add an alter table operation command
        stmts.push({
          type: 'alter_table_statement',
          tableName: model.name,
          actions: [
            {
              type: 'alter_column_definition',
              columnName: field.name,
              action: {
                type: 'set_column_default_clause',
                default: literal,
              },
            },
          ],
        })
      }
    }
  }
  if (stmts.length) {
    console.log(
      redent(`
        Great! Step 1 is to transition Prisma 1's @default's to default values backed by the database.
      `)
    )
    console.log(redent(print(stmts), 2))
  }
  result = await prompter.prompt({
    name: 'default',
    type: 'confirm',
    message: `Done? Press 'y' to continue`,
  })
  if (!result.default) {
    return
  }

  // upgrade @createdAt
  stmts = []
  for (let model of models) {
    const fields = model.fields
    for (let field of fields) {
      for (let directive of field.directives) {
        if (directive.name !== 'createdAt') {
          continue
        }
        // add an alter table operation command
        stmts.push({
          type: 'alter_table_statement',
          tableName: model.name,
          actions: [
            {
              type: 'alter_column_definition',
              columnName: field.name,
              action: {
                type: 'set_column_datatype_clause',
                datatype: 'datetime',
              },
            },
            {
              type: 'alter_column_definition',
              columnName: field.name,
              action: {
                type: 'set_column_default_clause',
                default: {
                  type: 'current_timestamp_value_function',
                },
              },
            },
          ],
        })
      }
    }
  }
  if (stmts.length) {
    console.log(
      redent(`
        Step 2 is to transition Prisma 1's @createdAt to a datetime type with a default value of now.
      `)
    )
    console.log(redent(print(stmts), 2))
    result = await prompter.prompt({
      name: 'createdAt',
      type: 'confirm',
      message: `Done? Press 'y' to continue`,
    })
    if (!result.createdAt) {
      return
    }
  }

  // upgrade @updatedAt
  stmts = []
  for (let model of models) {
    const fields = model.fields
    for (let field of fields) {
      for (let directive of field.directives) {
        if (directive.name !== 'updatedAt') {
          continue
        }
        // add an alter table operation command
        stmts.push({
          type: 'alter_table_statement',
          tableName: model.name,
          actions: [
            {
              type: 'alter_column_definition',
              columnName: field.name,
              action: {
                type: 'set_column_datatype_clause',
                datatype: 'datetime',
              },
            },
            {
              type: 'alter_column_definition',
              columnName: field.name,
              action: {
                type: 'set_column_default_clause',
                default: {
                  type: 'current_timestamp_value_function',
                },
              },
            },
          ],
        })
      }
    }
  }
  if (stmts.length) {
    console.log(
      redent(`
        Step 2 is to transition Prisma 1's @updatedAt to a datetime type with a default value of now.
      `)
    )
    console.log(redent(print(stmts), 2))
    result = await prompter.prompt({
      name: 'updatedAt',
      type: 'confirm',
      message: `Done? Press 'y' to continue`,
    })
    if (!result.updatedAt) {
      return
    }
  }

  console.log(`You're all set. Thanks for using Prisma!`)
  return
}
