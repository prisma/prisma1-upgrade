import { Console } from '../console'
import { Prompter } from '../prompter'
import Prisma1 from '../prisma1'
import Prisma2 from '../prisma2'
import printPG from '../sql/postgres'
import printMS from '../sql/mysql'
import * as sql from '../sql'

type UpgradeInput = {
  console: Console
  prompter: Prompter
  prisma1: Prisma1
  prisma2: Prisma2
}

// upgrade performs a set of rules
export async function upgrade(input: UpgradeInput): Promise<void> {
  const { console, prompter, prisma1, prisma2 } = input
  const stmts: sql.Stmt[] = []

  // before we get started, check that we have a supported sql dialect
  let print: ((ops: sql.Stmt[]) => string) | undefined
  switch (prisma2.provider) {
    case 'mysql':
      print = printMS
      break
    case 'postgres':
    case 'postgresql':
      print = printPG
      break
    default:
      throw new Error(`unsupported provider "${prisma2.provider}"`)
  }

  // upgrade the defaults
  const models = prisma1.objects
  for (let model of models) {
    const fields = model.fields
    for (let field of fields) {
      for (let directive of field.directives) {
        // found an @default
        if (directive.name === 'default') {
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
              throw new Error(
                `${model.name}.${field.name} with a @default(value: ${value.value}) is not support.`
              )
            case 'IntValue':
            case 'FloatValue':
              literal = {
                type: 'numeric_literal',
                value: value.value,
              }
              break
            case 'ListValue':
              throw new Error(
                `${model.name}.${field.name} with a @default(value: ${value.value}) is not support.`
              )
            case 'ObjectValue':
              throw new Error(
                `${model.name}.${field.name} with a @default(value: ${value.value}) is not support.`
              )
            case 'NullValue':
              throw new Error(
                `${model.name}.${field.name} with a @default(value: ${value.value}) is not support.`
              )
            case 'StringValue':
              literal = {
                type: 'string_literal',
                value: value.value,
              }
              break
            case 'Variable':
              throw new Error(
                `${model.name}.${field.name} with a @default(value: ${value.name}) is not support.`
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
  }

  console.log(print(stmts))

  // const p1Defaults =

  // const value = await prompter.prompt({
  //   type: 'text',
  //   name: 'twitter',
  //   message: `What's your twitter handle?`,
  //   initial: `terkelg`,
  //   format: (v) => `@${v}`,
  // })
  // console.log(value)
  return
}
