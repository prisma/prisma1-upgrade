import Prisma2, { Datasource } from '../prisma2'
import printPG from '../sql/postgres/print'
import * as Graph from '../prisma1/graph'
import printMS from '../sql/mysql/print'
import { Prompter } from '../prompter'
import { Console } from '../console'
import { parse, print } from 'prismafile'
import * as p2 from 'prismafile/dist/ast'
import Prisma1 from '../prisma1'
import * as sql from '../sql'
import redent from 'redent'

type UpgradeInput = {
  console: Console
  prompter: Prompter
  prisma1: Prisma1
  prisma2: Prisma2
  inspector: Inspector
}

export interface Inspector {
  introspect(
    schema: string
  ): Promise<{
    datamodel: string
  }>
}

function unsupported(msg: string): Error {
  return new Error(msg)
}

// Schema Op
type Op = UpsertAttributeOp | RemoveAttributeOp

type UpsertAttributeOp = {
  type: 'UpsertAttributeOp'
  model: p2.Identifier
  field: p2.Identifier
  attribute: p2.Attribute
}

type RemoveAttributeOp = {
  type: 'RemoveAttributeOp'
  model: p2.Identifier
  field: p2.Identifier
  attribute: p2.Attribute
}

const pos = { column: 0, line: 0, offset: 0 }

function ident(name: string): p2.Identifier {
  return {
    type: 'identifier',
    name: name,
    end: pos,
    start: pos,
  }
}

// upgrade performs a set of rules
export async function upgrade(input: UpgradeInput): Promise<p2.Schema> {
  const { console, prompter, prisma1, prisma2, inspector } = input
  const ops: Op[] = []

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
  let printSQL: ((ops: sql.Stmt[]) => string) | undefined
  switch (provider) {
    case 'mysql':
      printSQL = printMS
      break
    case 'postgres':
    case 'postgresql':
      printSQL = printPG
      break
    default:
      throw unsupported(`unsupported provider "${provider}"`)
  }

  await console.log(
    redent(`
      Welcome to the Prisma 1 to Prisma 2 upgrade tool.

      This tool is designed to help you gracefully transition your ${provider} database from Prisma 1 to Prisma 2.

      Here's how it works:

        1. We inspect the contents of your Prisma 1 datamodel file.
        2. We generate SQL commands for you to run on your database.
        3. We re-introspect your database to get a new Prisma 2 Schema.
        4. We apply any Prisma-specific changes to the new Prisma 2 Schema

      We will not try to migrate your database for you. You are in full control
      over the changes to your ${provider} database.

      We suggest you first run the subsequent SQL commands on your testing or staging ${provider} database.
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
    return reintrospect(inspector, datasource)
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
        let dataType: string | undefined
        const value = arg.value
        switch (value.kind) {
          case 'BooleanValue':
            literal = {
              type: 'boolean_literal',
              value: value.value,
            }
            dataType = `tinyint(1)`
            break
          case 'EnumValue':
            literal = {
              type: 'string_literal',
              value: value.value,
            }
            dataType = `varchar(191)`
            break
          case 'IntValue':
            literal = {
              type: 'numeric_literal',
              value: value.value,
            }
            dataType = `int(11)`
            break
          case 'FloatValue':
            literal = {
              type: 'numeric_literal',
              value: value.value,
            }
            dataType = `decimal(65,30)`
            break
          case 'ListValue':
            throw unsupported(
              `${model.name}.${field.name} with a @default(value: ${
                value.value
              }) is not supported.`
            )
          case 'ObjectValue':
            throw unsupported(
              `${model.name}.${field.name} with a @default(value: ${
                value.value
              }) is not supported.`
            )
          case 'NullValue':
            throw unsupported(
              `${model.name}.${field.name} with a @default(value: ${
                value.value
              }) is not supported.`
            )
          case 'StringValue':
            literal = {
              type: 'string_literal',
              value: value.value,
            }
            dataType = `mediumtext`
            break
          case 'Variable':
            throw unsupported(
              `${model.name}.${field.name} with a @default(value: ${
                value.name
              }) is not supported.`
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
                dataType: dataType,
                default: literal,
              },
            },
          ],
        })
      }
    }
  }
  if (stmts.length) {
    await console.log(
      redent(`
        Let's transition Prisma 1's @default's to default values backed by the database. Run the following SQL command against your database:
      `)
    )
    await console.sql(redent(printSQL(stmts), 2))
    result = await prompter.prompt({
      name: 'default',
      type: 'confirm',
      message: `Done migrating @default? Press 'y' to continue`,
    })
    await console.log('')
    if (!result.default) {
      return reintrospect(inspector, datasource)
    }
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
                type: 'set_column_default_clause',
                dataType: 'datetime',
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
    await console.log(
      redent(`
        Let's transition Prisma 1's @createdAt to a datetime type with a default value of now. Run the following SQL command against your database:
      `)
    )
    await console.sql(redent(printSQL(stmts), 2))
    result = await prompter.prompt({
      name: 'createdAt',
      type: 'confirm',
      message: `Done migrating @createdAt? Press 'y' to continue`,
    })
    if (!result.createdAt) {
      return reintrospect(inspector, datasource)
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
            // {
            //   type: 'alter_column_definition',
            //   columnName: field.name,
            //   action: {
            //     type: 'set_column_datatype_clause',
            //     datatype: 'datetime',
            //   },
            // },
            {
              type: 'alter_column_definition',
              columnName: field.name,
              action: {
                type: 'set_column_default_clause',
                dataType: 'datetime',
                // TODO: perhaps be smarter here.
                nullable: !!~field.type.toString().indexOf('?'),
                default: {
                  type: 'current_timestamp_value_function',
                },
              },
            },
          ],
        })
        // replace @default(now()) with @updatedAt
        ops.push(
          {
            type: 'UpsertAttributeOp',
            model: ident(model.name),
            field: ident(field.name),
            attribute: {
              type: 'attribute',
              name: ident('updatedAt'),
              arguments: [],
              start: pos,
              end: pos,
            },
          },
          {
            type: 'RemoveAttributeOp',
            model: ident(model.name),
            field: ident(field.name),
            attribute: {
              type: 'attribute',
              name: ident('default'),
              arguments: [],
              start: pos,
              end: pos,
            },
          }
        )
      }
    }
  }
  if (stmts.length) {
    await console.log(
      redent(`
        Let's transition Prisma 1's @updatedAt to a datetime type with a default value of now. Run the following SQL command against your database:
      `)
    )
    await console.sql(redent(printSQL(stmts), 2))
    result = await prompter.prompt({
      name: 'updatedAt',
      type: 'confirm',
      message: `Done migrating @updatedAt? Press 'y' to continue`,
    })
    console.log('')
    if (!result.updatedAt) {
      return reintrospect(inspector, datasource)
    }
  }

  // upgrade 1-1 relations Datamodel
  const graph = Graph.load(prisma1)

  // loop over edges and apply back-relation rules
  // to break up cycles and place the fields in the proper place
  stmts = []
  const edges = graph.edges()
  const visited: { [name: string]: string[] } = {}
  for (let i = 0; i < edges.length; i++) {
    const src = graph.node(edges[i].v)
    const dst = graph.node(edges[i].w)
    const edge1: Graph.Edge = graph.edge(edges[i].v, edges[i].w)

    // relation with a back-relation
    for (let j = 0; j < edges.length; j++) {
      // check for an edge going in the opposite direction
      if (edges[i].v !== edges[j].w || edges[j].v !== edges[i].w) {
        continue
      } else if (visited[src.name] && ~visited[src.name].indexOf(dst.name)) {
        continue
      }

      // mark as visited
      visited[src.name] = visited[src.name] || []
      visited[src.name].push(dst.name)
      visited[dst.name] = visited[dst.name] || []
      visited[dst.name].push(src.name)

      const edge2: Graph.Edge = graph.edge(edges[j].v, edges[j].w)
      // 1:1 relationship
      if (edge1.type === 'hasOne' && edge2.type === 'hasOne') {
        const uniqueEdge =
          edge1.link === 'INLINE' // edge inline
            ? edge1
            : edge2.link === 'INLINE' // edge2 inline
            ? edge2
            : edge1.from < edge2.from // alphanumeric
            ? edge1
            : edge2

        stmts.push({
          type: 'alter_table_statement',
          tableName: uniqueEdge.from,
          actions: [
            {
              type: 'add_table_constraint_definition',
              constraint: {
                type: 'table_constraint_definition',
                constraint: {
                  type: 'unique_constraint_definition',
                  spec: 'UNIQUE',
                  columns: [uniqueEdge.field],
                },
              },
            },
          ],
        })
      }
    }
  }
  if (stmts.length) {
    await console.log(
      redent(`
        Let's transition Prisma 1's 1-to-1 relations with @relation or @relation(link:INLINE) to unique constraints on the database. Run the following SQL command against your database:
      `)
    )
    await console.sql(redent(printSQL(stmts), 2))
    result = await prompter.prompt({
      name: 'inlineRelation',
      type: 'confirm',
      message: `Done migrating your inline relations? Press 'y' to continue`,
    })
    await console.log('')
    if (!result.inlineRelation) {
      return reintrospect(inspector, datasource)
    }
  }

  // next handle the Json type
  stmts = []
  for (let model of models) {
    const fields = model.fields
    for (let field of fields) {
      if (field.type.named() === 'Json') {
        stmts.push({
          type: 'alter_table_statement',
          tableName: model.name,
          actions: [
            {
              type: 'alter_column_definition',
              columnName: field.name,
              action: {
                type: 'set_column_datatype_clause',
                datatype: 'json',
              },
            },
          ],
        })
      }
    }
  }
  if (stmts.length) {
    await console.log(
      redent(`
        Let's transition Prisma 1's Json type to a json type in the database. Run the following SQL command against your database:
      `)
    )
    await console.sql(redent(printSQL(stmts), 2))
    result = await prompter.prompt({
      name: 'json',
      type: 'confirm',
      message: `Done migrating Json? Press 'y' to continue`,
    })
    await console.log('')
    if (!result.json) {
      return reintrospect(inspector, datasource)
    }
  }

  // next we'll find ID and UUID datatypes
  for (let model of models) {
    const fields = model.fields
    for (let field of fields) {
      // handle ID types
      if (field.type.named() === 'ID') {
        ops.push({
          type: 'UpsertAttributeOp',
          model: ident(model.name),
          field: ident(field.name),
          attribute: {
            type: 'attribute',
            name: ident('default'),
            end: pos,
            start: pos,
            arguments: [
              {
                type: 'unkeyed_argument',
                end: pos,
                start: pos,
                value: {
                  type: 'function_value',
                  name: ident('cuid'),
                  arguments: [],
                  end: pos,
                  start: pos,
                },
              },
            ],
          },
        })
      }
      // handle UUIDs
      if (field.type.named() === 'UUID') {
        ops.push({
          type: 'UpsertAttributeOp',
          model: ident(model.name),
          field: ident(field.name),
          attribute: {
            type: 'attribute',
            name: ident('default'),
            end: pos,
            start: pos,
            arguments: [
              {
                type: 'unkeyed_argument',
                end: pos,
                start: pos,
                value: {
                  type: 'function_value',
                  name: ident('uuid'),
                  arguments: [],
                  end: pos,
                  start: pos,
                },
              },
            ],
          },
        })
      }
    }
  }

  const schema = await reintrospect(inspector, datasource)
  console.error('after introspection', print(schema))
  for (let op of ops) {
    switch (op.type) {
      case 'UpsertAttributeOp':
        for (let block of schema.blocks) {
          if (block.type !== 'model' || block.name !== op.model) {
            continue
          }
          for (let prop of block.properties) {
            if (prop.type !== 'field' || prop.name !== op.field) {
              continue
            }
            console.error(block.name, prop.name)
            let found = false
            for (let i = 0; i < prop.attributes.length; i++) {
              const attr = prop.attributes[i]
              if (
                attr.name !== op.attribute.name ||
                attr.group !== op.attribute.group
              ) {
                continue
              }
              found = true
              // update
              prop.attributes[i] = op.attribute
            }
            // insert
            if (!found) {
              prop.attributes.push(op.attribute)
            }
          }
        }
        break
      case 'RemoveAttributeOp':
        for (let block of schema.blocks) {
          if (block.type !== 'model' || block.name !== op.model) {
            continue
          }
          for (let prop of block.properties) {
            if (prop.type !== 'field' || prop.name !== op.field) {
              continue
            }
            let idx = -1
            for (let i = 0; i < prop.attributes.length; i++) {
              const attr = prop.attributes[i]
              if (attr.name !== op.attribute.name) {
                continue
              }
              idx = i
            }
            if (~idx) {
              prop.attributes.splice(idx, 1)
            }
          }
        }
        break
      default:
        throw new Error(`unhandled operation: "${op!.type}"`)
    }
  }
  await console.log(`You're all set. Thanks for using Prisma!`)

  return schema
}

async function reintrospect(
  inspector: Inspector,
  ds: Datasource
): Promise<p2.Schema> {
  console.log(`
    datasource db {
      provider = "${ds.provider}"
      url = "${ds.url}"
    }
  `)
  const { datamodel } = await inspector.introspect(`
    datasource db {
      provider = "${ds.provider}"
      url = "${ds.url}"
    }
  `)
  return parse(datamodel)
}
