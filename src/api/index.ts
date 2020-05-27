import * as p2ast from 'prismafile/dist/ast'
import * as graph from '../prisma1/graph'
import * as p2 from '../prisma2'
import * as p1 from '../prisma1'
import * as sql from '../sql'

type Input = {
  prisma1: p1.Schema
  prisma2: p2.Schema
}

type Output = {
  schema: p2.Schema
  ops: sql.Op[]
}

// upgrade performs a set of rules
export async function upgrade(input: Input): Promise<Output> {
  const { prisma1, prisma2 } = input
  // const { prompter } = input

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

  const ops: sql.Op[] = []

  for (let p1Model of prisma1.objects) {
    const p2Model = prisma2.findModel((m) => m.name === p1Model.name)
    if (!p2Model) {
      continue
    }
    for (let p1Field of p1Model.fields) {
      const p2Field = p2Model.findField((f) => f.name === p1Field.name)
      if (!p2Field) {
        continue
      }

      // handle the Json type
      if (p1Field.type.named() === 'Json' && !isJsonType(p2Field)) {
        ops.push({
          type: 'SetJsonTypeOp',
          p1Model,
          p1Field,
        })
      }

      // loop over attributes
      for (let p1Attr of p1Field.directives) {
        // we found a @default in P1
        if (p1Attr.name === 'default') {
          const p1Arg = p1Attr.findArgument((a) => a.name === 'value')
          if (!p1Arg) {
            continue
          }
          const p2Attr = p2Field.findAttribute((a) => a.name === 'default')
          // @default is already in P2
          if (p2Attr && hasExpectedDefault(p1Arg, p2Attr.arguments[0])) {
            continue
          }
          ops.push({
            type: 'SetDefaultOp',
            p1Model,
            p1Field,
            p1Attr,
          })
        }
        // we found a @createdAt in P1 and it's not in P2
        if (p1Attr.name === 'createdAt' && !hasDefaultNow(p2Field)) {
          ops.push({
            type: 'SetCreatedAtOp',
            p1Model,
            p1Field,
            p1Attr,
          })
        }
        // we found a @updatedAt in P1 and it's not in P2
        if (p1Attr.name === 'updatedAt' && !hasUpdatedAt(p2Field)) {
          ops.push({
            type: 'SetCreatedAtOp',
            p1Model,
            p1Field,
            p1Attr,
          })
        }
      }
    }
  }

  // upgrade 1-1 relations Datamodel
  // loop over edges and apply back-relation rules
  // to break up cycles and place the fields in the proper place
  const g = graph.load(prisma1)
  const edges = g.edges()
  const visited: { [name: string]: string[] } = {}
  for (let i = 0; i < edges.length; i++) {
    const src = g.node(edges[i].v)
    const dst = g.node(edges[i].w)
    const edge1: graph.Edge = g.edge(edges[i].v, edges[i].w)

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

      const edge2: graph.Edge = g.edge(edges[j].v, edges[j].w)
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

        // add constraint if it's not a 1-to-1 already
        if (!isOneToOne(prisma2, uniqueEdge)) {
          ops.push({
            type: 'AddUniqueConstraintOp',
            table: uniqueEdge.from,
            column: uniqueEdge.field,
          })
        }
      }
    }
  }

  return {
    schema: prisma2,
    ops,
  }
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

function hasExpectedDefault(p1Arg: p1.Argument, p2Arg?: p2.Argument): boolean {
  if (!p2Arg) return false
  switch (p1Arg.value.kind) {
    case 'BooleanValue':
      return p2Arg.value.type === 'boolean_value'
    case 'EnumValue':
      return p2Arg.value.type === 'string_value'
    case 'FloatValue':
      return p2Arg.value.type === 'float_value'
    case 'IntValue':
      return p2Arg.value.type === 'int_value'
    case 'ListValue':
      return p2Arg.value.type === 'list_value'
    case 'ObjectValue':
      return p2Arg.value.type === 'map_value'
    case 'StringValue':
      return p2Arg.value.type === 'string_value'
    case 'Variable':
      return p2Arg.value.type === 'function_value'
    // TODO: these are unhandled values
    case 'NullValue':
      return false
  }
}

function hasDefaultNow(field: p2.Field): boolean {
  const attr = field.findAttribute((a) => a.name === 'default')
  if (!attr) return false
  return attr.toString() === '@default(now())'
}

function hasUpdatedAt(field: p2.Field): boolean {
  return !!field.findAttribute((a) => a.name === 'updatedAt')
}

function isOneToOne(schema: p2.Schema, edge: graph.Edge): boolean {
  const fromModel = schema.findModel((m) => m.name === edge.from)
  if (!fromModel) return false
  const fromField = fromModel.findField((f) => f.name === edge.field)
  if (!fromField) return false
  const uniqueAttr = fromField.findAttribute((a) => a.name === 'unique')
  if (!uniqueAttr) return false
  const toModel = schema.findModel((m) => m.name === edge.to)
  if (!toModel) return false
  const toField = toModel.findField((f) => f.name === edge.from)
  if (!toField) return false
  if (!toField.type.optional) return false
  return true
}

function isJsonType(field: p2.Field): boolean {
  return field.type.innermost().toString() === 'Json'
}
