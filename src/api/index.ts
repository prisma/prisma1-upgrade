import * as p2ast from 'prismafile/dist/ast'
import printPG from '../sql/postgres/print'
import * as Graph from '../prisma1/graph'
import * as p2 from '../prisma2'
import printMS from '../sql/mysql/print'
import { Inspector } from '../inspector'
import { Prompter } from '../prompter'
import { Console } from '../console'
import * as p1 from '../prisma1'
import * as sets from '../sets'
import * as sql from '../sql2'
import redent from 'redent'

type UpgradeInput = {
  console: Console
  prompter: Prompter
  prisma1: p1.Schema
  prisma2: p2.Schema
  inspector: Inspector
}

function unsupported(msg: string): Error {
  return new Error(msg)
}

// upgrade performs a set of rules
export async function upgrade(input: UpgradeInput): Promise<p2.Schema> {
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
  let printer: sql.Printer
  switch (provider) {
    case 'mysql':
      printer = new sql.MySQL5()
      break
    case 'postgres':
    case 'postgresql':
      printer = new sql.Postgres()
      break
    default:
      throw unsupported(`unsupported provider "${provider}"`)
  }

  // await console.log(
  //   redent(`
  //     Welcome to the Prisma 1 to Prisma 2 upgrade tool.

  //     This tool is designed to help you transition your ${provider} database from Prisma 1 to Prisma 2.

  //     Here's how it works:

  //       1. We inspect the contents of your Prisma 1 and Prisma 2 schema files.
  //       2. We apply any Prisma-specific changes to your Prisma 2 schema file.
  //       3. We generate SQL commands for you to run on your database.

  //     We will not try to migrate your database for you. You are in full control
  //     over the changes to your ${provider} database.

  //     We suggest you first run the subsequent SQL commands on your testing or staging ${provider} database.
  //     Then when you're confident with the transition you can migrate your production database.

  //     If you have any questions along the way, please reach out to hi@prisma.io.
  //   `)
  // )

  // let result = await prompter.prompt({
  //   name: 'welcome',
  //   type: 'confirm',
  //   message: `Are you ready to get started?`,
  // })
  // if (!result.welcome) {
  //   return prisma2
  // }

  // first we'll transform P2 schema to make up for temporary re-introspection limitations.
  const models = prisma1.objects
  // loop over p1 models
  for (let p1Model of models) {
    const fields = p1Model.fields
    // find the corresponding p2 model
    for (let p2Model of prisma2.models) {
      if (p2Model.name !== p1Model.name) {
        continue
      }
      // next we'll loop over p1 fields
      for (let p1Field of fields) {
        // find the corresponding p2 field
        for (let p2Field of p2Model.fields) {
          if (p2Field.name !== p1Field.name) {
            continue
          }
          switch (p1Field.type.named()) {
            case 'ID': // Rule 1: add @default(cuid()) for P1 ID types
              p2Field.upsertAttribute(defaultAttr(cuid()))
              break
            case 'UUID': // Rule 2: @default(uuid()) for P1 UUID types
              p2Field.upsertAttribute(defaultAttr(uuid()))
              break
          }
          // next, we'll loop over the P1 attributes
          for (let p1Attr of p1Field.directives) {
            // Rule 3: when we see an @updatedAt in P1, replace @default(now()) with @updatedAt
            if (p1Attr.name === 'updatedAt' && hasDefaultNow(p2Field)) {
              p2Field.removeAttribute((attr) => attr.name === 'default')
              p2Field.upsertAttribute(updatedAt())
            }
          }
        }
      }
    }
  }

  const defaultOps: sql.Op[] = []
  const createdAtOps: sql.Op[] = []
  const updatedAtOps: sql.Op[] = []

  // get the models that are common between P1 and P2 schemas
  const modelPairs = sets.intersectModels(prisma1.objects, prisma2.models)
  for (let modelPair of modelPairs) {
    const [p1Model, p2Model] = modelPair
    // get the fields that are common between p1 model & p2 model
    const fieldPairs = sets.intersectFields(p1Model.fields, p2Model.fields)
    for (let fieldPair of fieldPairs) {
      const [p1Field, p2Field] = fieldPair
      // get P1 attributes missing from P2
      const p1Attrs = sets.diffP1Attrs(p1Field.directives, p2Field.attributes)
      for (let p1Attr of p1Attrs) {
        // we found a @default in P1
        if (p1Attr.name === 'default') {
          defaultOps.push({
            type: 'SetDefaultOp',
            p1Model,
            p2Model,
            p1Field,
            p2Field,
            p1Attr,
          })
        }
        // we found a @createdAt in P1
        if (p1Attr.name === 'createdAt' && !hasDefaultNow(p2Field)) {
          createdAtOps.push({
            type: 'SetCreatedAtOp',
            p1Model,
            p2Model,
            p1Field,
            p2Field,
            p1Attr,
          })
        }

        // we found a @updatedAt in P1
        if (p1Attr.name === 'updatedAt' && !hasDefaultNow(p2Field)) {
          updatedAtOps.push({
            type: 'SetCreatedAtOp',
            p1Model,
            p2Model,
            p1Field,
            p2Field,
            p1Attr,
          })
        }
      }
    }
  }

  for (let op of defaultOps) {
    await console.sql(printer.print(op))
  }

  for (let op of createdAtOps) {
    await console.sql(printer.print(op))
  }

  for (let op of updatedAtOps) {
    await console.sql(printer.print(op))
  }

  // if (defaults.length){
  // }

  // let stmts: sql.Stmt[] = []
  // // upgrade the defaults
  // // const models = prisma1.objects
  // for (let model of models) {
  //   const fields = model.fields
  //   for (let field of fields) {
  //     const directive = field.findDirective((d) => d.name === 'default')
  //     if (!directive) {
  //       continue
  //     }

  //     for (let directive of field.directives) {
  //       // skip anything but @default
  //       if (directive.name !== 'default') {
  //         continue
  //       }
  //       const arg = directive.arguments.find((arg) => arg.name === 'value')
  //       if (!arg) {
  //         continue
  //       }
  //       // add an alter table operation command
  //       stmts.push({
  //         type: 'alter_table_statement',
  //         tableName: model.name,
  //         actions: [
  //           {
  //             type: 'alter_column_definition',
  //             columnName: field.name,
  //             action: valueToDefault(model, field, arg.value),
  //           },
  //         ],
  //       })
  //     }
  //   }
  // }
  // if (stmts.length) {
  //   await console.log(
  //     redent(`
  //       Let's transition Prisma 1's @default's to default values backed by the database. Run the following SQL command against your database:
  //     `)
  //   )
  //   await console.sql(redent(printSQL(stmts), 2))
  //   result = await prompter.prompt({
  //     name: 'default',
  //     type: 'confirm',
  //     message: `Done migrating @default? Press 'y' to continue`,
  //   })
  //   await console.log('')
  //   if (!result.default) {
  //     return prisma2
  //   }
  // }

  // // upgrade @createdAt
  // stmts = []
  // for (let model of models) {
  //   const fields = model.fields
  //   for (let field of fields) {
  //     for (let directive of field.directives) {
  //       if (directive.name !== 'createdAt') {
  //         continue
  //       }
  //       // add an alter table operation command
  //       stmts.push({
  //         type: 'alter_table_statement',
  //         tableName: model.name,
  //         actions: [
  //           {
  //             type: 'alter_column_definition',
  //             columnName: field.name,
  //             action: {
  //               type: 'set_column_default_clause',
  //               dataType: 'datetime',
  //               default: {
  //                 type: 'current_timestamp_value_function',
  //               },
  //             },
  //           },
  //         ],
  //       })
  //     }
  //   }
  // }
  // if (stmts.length) {
  //   await console.log(
  //     redent(`
  //       Let's transition Prisma 1's @createdAt to a datetime type with a default value of now. Run the following SQL command against your database:
  //     `)
  //   )
  //   await console.sql(redent(printSQL(stmts), 2))
  //   result = await prompter.prompt({
  //     name: 'createdAt',
  //     type: 'confirm',
  //     message: `Done migrating @createdAt? Press 'y' to continue`,
  //   })
  //   if (!result.createdAt) {
  //     return prisma2
  //   }
  // }

  // // upgrade @updatedAt
  // stmts = []
  // for (let model of models) {
  //   const fields = model.fields
  //   for (let field of fields) {
  //     for (let directive of field.directives) {
  //       if (directive.name !== 'updatedAt') {
  //         continue
  //       }
  //       // add an alter table operation command
  //       stmts.push({
  //         type: 'alter_table_statement',
  //         tableName: model.name,
  //         actions: [
  //           // {
  //           //   type: 'alter_column_definition',
  //           //   columnName: field.name,
  //           //   action: {
  //           //     type: 'set_column_datatype_clause',
  //           //     datatype: 'datetime',
  //           //   },
  //           // },
  //           {
  //             type: 'alter_column_definition',
  //             columnName: field.name,
  //             action: {
  //               type: 'set_column_default_clause',
  //               dataType: 'datetime',
  //               // TODO: perhaps be smarter here.
  //               nullable: !!~field.type.toString().indexOf('?'),
  //               default: {
  //                 type: 'current_timestamp_value_function',
  //               },
  //             },
  //           },
  //         ],
  //       })
  //       // replace @default(now()) with @updatedAt
  //       // ops.push(
  //       //   {
  //       //     type: 'UpsertAttributeOp',
  //       //     model: ident(model.name),
  //       //     field: ident(field.name),
  //       //     attribute: {
  //       //       type: 'attribute',
  //       //       name: ident('updatedAt'),
  //       //       arguments: [],
  //       //       start: pos,
  //       //       end: pos,
  //       //     },
  //       //   },
  //       //   {
  //       //     type: 'RemoveAttributeOp',
  //       //     model: ident(model.name),
  //       //     field: ident(field.name),
  //       //     attribute: {
  //       //       type: 'attribute',
  //       //       name: ident('default'),
  //       //       arguments: [],
  //       //       start: pos,
  //       //       end: pos,
  //       //     },
  //       //   }
  //       // )
  //     }
  //   }
  // }
  // if (stmts.length) {
  //   await console.log(
  //     redent(`
  //       Let's transition Prisma 1's @updatedAt to a datetime type with a default value of now. Run the following SQL command against your database:
  //     `)
  //   )
  //   await console.sql(redent(printSQL(stmts), 2))
  //   result = await prompter.prompt({
  //     name: 'updatedAt',
  //     type: 'confirm',
  //     message: `Done migrating @updatedAt? Press 'y' to continue`,
  //   })
  //   console.log('')
  //   if (!result.updatedAt) {
  //     return prisma2
  //   }
  // }

  // // upgrade 1-1 relations Datamodel
  // const graph = Graph.load(prisma1)

  // // loop over edges and apply back-relation rules
  // // to break up cycles and place the fields in the proper place
  // stmts = []
  // const edges = graph.edges()
  // const visited: { [name: string]: string[] } = {}
  // for (let i = 0; i < edges.length; i++) {
  //   const src = graph.node(edges[i].v)
  //   const dst = graph.node(edges[i].w)
  //   const edge1: Graph.Edge = graph.edge(edges[i].v, edges[i].w)

  //   // relation with a back-relation
  //   for (let j = 0; j < edges.length; j++) {
  //     // check for an edge going in the opposite direction
  //     if (edges[i].v !== edges[j].w || edges[j].v !== edges[i].w) {
  //       continue
  //     } else if (visited[src.name] && ~visited[src.name].indexOf(dst.name)) {
  //       continue
  //     }

  //     // mark as visited
  //     visited[src.name] = visited[src.name] || []
  //     visited[src.name].push(dst.name)
  //     visited[dst.name] = visited[dst.name] || []
  //     visited[dst.name].push(src.name)

  //     const edge2: Graph.Edge = graph.edge(edges[j].v, edges[j].w)
  //     // 1:1 relationship
  //     if (edge1.type === 'hasOne' && edge2.type === 'hasOne') {
  //       const uniqueEdge =
  //         edge1.link === 'INLINE' // edge inline
  //           ? edge1
  //           : edge2.link === 'INLINE' // edge2 inline
  //           ? edge2
  //           : edge1.from < edge2.from // alphanumeric
  //           ? edge1
  //           : edge2

  //       stmts.push({
  //         type: 'alter_table_statement',
  //         tableName: uniqueEdge.from,
  //         actions: [
  //           {
  //             type: 'add_table_constraint_definition',
  //             constraint: {
  //               type: 'table_constraint_definition',
  //               constraint: {
  //                 type: 'unique_constraint_definition',
  //                 spec: 'UNIQUE',
  //                 columns: [uniqueEdge.field],
  //               },
  //             },
  //           },
  //         ],
  //       })
  //     }
  //   }
  // }
  // if (stmts.length) {
  //   await console.log(
  //     redent(`
  //       Let's transition Prisma 1's 1-to-1 relations with @relation or @relation(link:INLINE) to unique constraints on the database. Run the following SQL command against your database:
  //     `)
  //   )
  //   await console.sql(redent(printSQL(stmts), 2))
  //   result = await prompter.prompt({
  //     name: 'inlineRelation',
  //     type: 'confirm',
  //     message: `Done migrating your inline relations? Press 'y' to continue`,
  //   })
  //   await console.log('')
  //   if (!result.inlineRelation) {
  //     return prisma2
  //   }
  // }

  // // next handle the Json type
  // stmts = []
  // for (let model of models) {
  //   const fields = model.fields
  //   for (let field of fields) {
  //     if (field.type.named() === 'Json') {
  //       stmts.push({
  //         type: 'alter_table_statement',
  //         tableName: model.name,
  //         actions: [
  //           {
  //             type: 'alter_column_definition',
  //             columnName: field.name,
  //             action: {
  //               type: 'set_column_datatype_clause',
  //               datatype: 'json',
  //             },
  //           },
  //         ],
  //       })
  //     }
  //   }
  // }
  // if (stmts.length) {
  //   await console.log(
  //     redent(`
  //       Let's transition Prisma 1's Json type to a json type in the database. Run the following SQL command against your database:
  //     `)
  //   )
  //   await console.sql(redent(printSQL(stmts), 2))
  //   result = await prompter.prompt({
  //     name: 'json',
  //     type: 'confirm',
  //     message: `Done migrating Json? Press 'y' to continue`,
  //   })
  //   await console.log('')
  //   if (!result.json) {
  //     return prisma2
  //   }
  // }

  // const schema = await reintrospect(inspector, datasource)
  // for (let op of ops) {
  //   switch (op.type) {
  //     case 'UpsertAttributeOp':
  //       for (let block of schema.blocks) {
  //         if (block.type !== 'model' || block.name.name !== op.model.name) {
  //           continue
  //         }
  //         for (let prop of block.properties) {
  //           if (prop.type !== 'field' || prop.name.name !== op.field.name) {
  //             continue
  //           }
  //           let found = false
  //           for (let i = 0; i < prop.attributes.length; i++) {
  //             const attr = prop.attributes[i]
  //             if (
  //               attr.name.name !== op.attribute.name.name ||
  //               attr.group?.name !== op.attribute.group?.name
  //             ) {
  //               continue
  //             }
  //             found = true
  //             // update
  //             prop.attributes[i] = op.attribute
  //           }
  //           // insert
  //           if (!found) {
  //             prop.attributes.push(op.attribute)
  //           }
  //         }
  //       }
  //       break
  //     case 'RemoveAttributeOp':
  //       for (let block of schema.blocks) {
  //         if (block.type !== 'model' || block.name.name !== op.model.name) {
  //           continue
  //         }
  //         for (let prop of block.properties) {
  //           if (prop.type !== 'field' || prop.name.name !== op.field.name) {
  //             continue
  //           }
  //           let idx = -1
  //           for (let i = 0; i < prop.attributes.length; i++) {
  //             const attr = prop.attributes[i]
  //             if (attr.name.name !== op.attribute.name.name) {
  //               continue
  //             }
  //             idx = i
  //           }
  //           if (~idx) {
  //             prop.attributes.splice(idx, 1)
  //           }
  //         }
  //       }
  //       break
  //     default:
  //       throw new Error(`unhandled operation: "${op!.type}"`)
  //   }
  // }
  await console.log(`You're all set. Thanks for using Prisma!`)

  return prisma2
}

const pos = { column: 0, line: 0, offset: 0 }

function ident(name: string): p2ast.Identifier {
  return {
    type: 'identifier',
    name: name,
    end: pos,
    start: pos,
  }
}

function defaultAttr(value: p2ast.Value): p2ast.Attribute {
  return {
    type: 'attribute',
    name: ident('default'),
    end: pos,
    start: pos,
    arguments: [
      {
        type: 'unkeyed_argument',
        end: pos,
        start: pos,
        value,
      },
    ],
  }
}

function updatedAt(): p2ast.Attribute {
  return {
    type: 'attribute',
    name: ident('updatedAt'),
    end: pos,
    start: pos,
    arguments: [],
  }
}

// cuid()
function cuid(): p2ast.FunctionValue {
  return {
    type: 'function_value',
    name: ident('cuid'),
    arguments: [],
    end: pos,
    start: pos,
  }
}

// uuid()
function uuid(): p2ast.FunctionValue {
  return {
    type: 'function_value',
    name: ident('uuid'),
    arguments: [],
    end: pos,
    start: pos,
  }
}

function hasDefaultNow(field: p2.Field): boolean {
  const attr = field.findAttribute((a) => a.name === 'default')
  if (!attr) return false
  return attr.toString() === '@default(now())'
}

// function valueToDefault(
//   model: p1.ObjectTypeDefinition,
//   field: p1.FieldDefinition,
//   value: p1.Value
// ): sql.AlterColumnAction {
//   switch (value.kind) {
//     case 'BooleanValue':
//       return {
//         type: 'set_column_default_clause',
//         dataType: `tinyint(1)`,
//         default: {
//           type: 'boolean_literal',
//           value: value.value,
//         },
//       }
//     case 'EnumValue':
//       return {
//         type: 'set_column_default_clause',
//         dataType: `varchar(191)`,
//         default: {
//           type: 'string_literal',
//           value: value.value,
//         },
//       }
//     case 'IntValue':
//       return {
//         type: 'set_column_default_clause',
//         dataType: `int(11)`,
//         default: {
//           type: 'numeric_literal',
//           value: value.value,
//         },
//       }
//     case 'FloatValue':
//       return {
//         type: 'set_column_default_clause',
//         dataType: `decimal(65,30)`,
//         default: {
//           type: 'numeric_literal',
//           value: value.value,
//         },
//       }
//     case 'StringValue':
//       return {
//         type: 'set_column_default_clause',
//         dataType: `mediumtext`,
//         default: {
//           type: 'string_literal',
//           value: value.value,
//         },
//       }
//     default:
//       throw unsupported(
//         `default type ${value.kind} in ${model.name}.${
//           field.name
//         } is not supported.`
//       )
//   }
// }

// async function reintrospect(
//   inspector: Inspector,
//   ds: Datasource
// ): Promise<p2.Schema> {
//   console.log(`
//     datasource db {
//       provider = "${ds.provider}"
//       url = "${ds.url}"
//     }
//   `)
//   const datamodel = await inspector.inspect(`
//     datasource db {
//       provider = "${ds.provider}"
//       url = "${ds.url}"
//     }
//   `)
//   return parse(datamodel)
// }
