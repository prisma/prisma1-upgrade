import * as p2ast from 'prismafile/dist/ast'
import * as graph from '../prisma1/graph'
import * as p2 from '../prisma2'
import * as p1 from '../prisma1'
import * as uri from 'url'
import * as sql from '../sql'

type Input = {
  prisma1: p1.Schema
  prisma2: p2.Schema
  // needed for postgres
  url: string
}

type Output = {
  schema: p2.Schema
  warnings: string[]
  ops: sql.Op[]
}

// upgrade performs a set of rules
export async function upgrade(input: Input): Promise<Output> {
  const { prisma1, prisma2, url } = input
  const pgSchema = getPGSchema(url)
  const provider = prisma2.provider()
  const warnings: string[] = []

  // gather the enums
  let p1Enums: { [name: string]: p1.EnumTypeDefinition } = {}
  for (let p1Enum of prisma1.enums) {
    p1Enums[p1Enum.name] = p1Enum
  }
  let p2Enums: { [name: string]: p2.Enum } = {}
  for (let p2Enum of prisma2.enums) {
    p2Enums[p2Enum.name] = p2Enum
  }

  // first we'll transform P2 schema to make up for temporary re-introspection limitations.
  const models = prisma1.objects
  // loop over p1 models
  for (let p1Model of models) {
    const fields = p1Model.fields
    // find the corresponding p2 model
    for (let p2Model of prisma2.models) {
      if (p2Model.name !== p1Model.dbname) {
        continue
      }
      // add @map
      // K: @db on types/fields to determine the name of table/column in the underlying database
      if (p2Model.name !== p1Model.name) {
        p2Model.rename(p1Model.name)
      }
      // next we'll loop over p1 fields
      for (let p1Field of fields) {
        // find the corresponding p2 field
        for (let p2Field of p2Model.fields) {
          if (p2Field.name !== p1Field.dbname) {
            continue
          }
          // add @map
          // K: @db on types/fields to determine the name of table/column in the underlying database
          if (p2Field.name !== p1Field.name) {
            p2Field.rename(p1Field.name)
          }
          // D: String IDs are missing information what kind they are
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
            // G: @updatedAt is lost
            if (p1Attr.name === 'updatedAt') {
              p2Field.upsertAttribute(updatedAt())
            }
            // MySQL only: defaults don't work for TEXT (and it's variants)
            // but they do work at the Prisma-level, so we'll provide them.
            if (isMySQLDefaultText(provider, p1Field, p1Attr)) {
              const value = getDefaultValueString(p1Attr)
              if (typeof value === 'string') {
                p2Field.upsertAttribute(
                  defaultAttr({
                    type: 'string_value',
                    start: pos,
                    end: pos,
                    value: value,
                  })
                )
              }
            }
            // mysql only: defaults don't work for JSON
            if (isMySQLDefaultJson(provider, p1Field, p1Attr)) {
              warnings.push(
                `Prisma 2.0 doesn't support the Json data type with a default yet.

                See: https://github.com/prisma/prisma/issues/2556 for more information.`
              )
              continue
            }
            // Postgres only: @default(<ENUM>) currently generated @default(dbgenerated())
            // TODO: test & remove after https://github.com/prisma/prisma-engines/pull/794
            // is merged
            if (isPostgresDefaultEnum(provider, p1Field, p1Attr, p1Enums)) {
              const value = getDefaultValueEnum(p1Attr)
              if (typeof value === 'string') {
                p2Field.upsertAttribute(
                  defaultAttr({
                    type: 'reference_value',
                    start: pos,
                    end: pos,
                    name: {
                      type: 'identifier',
                      start: pos,
                      end: pos,
                      name: value,
                    },
                  })
                )
              }
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

      // H: JSON is represented as String
      if (p1Field.type.named() === 'Json' && !isJsonType(p2Field)) {
        ops.push({
          type: 'SetJsonTypeOp',
          schema: pgSchema,
          p1Model,
          p1Field,
        })
      }

      // J: Singular Enum is a simple String
      const p1Enum = p1Enums[p1Field.type.named()]
      const p2Enum = p2Enums[p2Field.type.innermost().toString()]
      if (p1Enum && !p2Enum) {
        ops.push({
          type: 'SetEnumTypeOp',
          schema: pgSchema,
          p1Model,
          p1Field,
          p1Enum,
        })
      }

      // loop over attributes
      for (let p1Attr of p1Field.directives) {
        // A: @default value is missing
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
          // mysql only: defaults don't work for TEXT (and it's variants)
          // but they do work at the Prisma-level, so we'll provide them.
          if (isMySQLDefaultText(provider, p1Field, p1Attr)) {
            continue
          }
          // mysql only: defaults don't work for JSON
          if (isMySQLDefaultJson(provider, p1Field, p1Attr)) {
            continue
          }
          ops.push({
            type: 'SetDefaultOp',
            schema: pgSchema,
            p1Model,
            p1Field,
            p1Attr,
            p1Enum,
          })
        }
        // we found a @createdAt in P1 and it's not in P2
        if (p1Attr.name === 'createdAt') {
          // maybe add the SQL command if we don't already have @default(now)
          if (!hasDefaultNow(p2Field)) {
            ops.push({
              type: 'SetCreatedAtOp',
              schema: pgSchema,
              p1Model,
              p1Field,
              p1Attr,
            })
          }
          // either way upsert default(now())
          // F: @defaultNow for @createdAt is lost after a re-deploy. Add it back in.
          p2Field.upsertAttribute(defaultNow())
        }
      }
    }
  }

  // B: 1-1 relations Datamodel v1.1
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
      if (
        edge1.type === 'hasOne' &&
        edge1.link !== 'TABLE' &&
        edge2.type === 'hasOne' &&
        edge2.link !== 'TABLE'
      ) {
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
            schema: pgSchema,
            table: uniqueEdge.from.name,
            column: uniqueEdge.field.name,
          })
        }

        // L: 1-1 relation with both sides required details
        const p2Field1 = prisma2.findField(
          (m, f) => edge1.from.name === m.name && edge1.to.name === f.name
        )
        if (p2Field1) {
          p2Field1.setType(toP2Type(edge1.field.type))
        }
        const p2Field2 = prisma2.findField(
          (m, f) => edge2.from.name === m.name && edge2.to.name === f.name
        )
        if (p2Field2) {
          p2Field2.setType(toP2Type(edge2.field.type))
        }
      }
    }
  }

  return {
    schema: prisma2,
    warnings,
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

function defaultNow(): p2ast.Attribute {
  return defaultAttr({
    type: 'function_value',
    name: {
      type: 'identifier',
      name: 'now',
      start: pos,
      end: pos,
    },
    start: pos,
    end: pos,
    arguments: [],
  })
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
      return (
        p2Arg.value.type === 'reference_value' ||
        // TODO: remove once we close:
        // https://github.com/prisma/prisma/issues/2689
        p2Arg.value.type === 'function_value'
      )
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

function isOneToOne(schema: p2.Schema, edge: graph.Edge): boolean {
  const fromModel = schema.findModel((m) => m.name === edge.from.name)
  if (!fromModel) return false
  const fromField = fromModel.findField((f) => f.name === edge.field.name)
  if (!fromField) return false
  const uniqueAttr = fromField.findAttribute((a) => a.name === 'unique')
  if (!uniqueAttr) return false
  const toModel = schema.findModel((m) => m.name === edge.to.name)
  if (!toModel) return false
  const toField = toModel.findField((f) => f.name === edge.from.name)
  if (!toField) return false
  if (!toField.type.optional) return false
  return true
}

function isJsonType(field: p2.Field): boolean {
  return field.type.innermost().toString() === 'Json'
}

function isMySQLDefaultText(
  provider: string,
  field: p1.FieldDefinition,
  directive: p1.Directive
): boolean {
  return (
    provider === 'mysql' &&
    field.type.named() === 'String' &&
    directive.name === 'default' &&
    !!directive.findArgument((arg) => arg.name === 'value')
  )
}

function isMySQLDefaultJson(
  provider: string,
  field: p1.FieldDefinition,
  directive: p1.Directive
): boolean {
  return (
    provider === 'mysql' &&
    field.type.named() === 'Json' &&
    directive.name === 'default' &&
    !!directive.findArgument((arg) => arg.name === 'value')
  )
}

function isPostgresDefaultEnum(
  provider: string,
  p1Field: p1.FieldDefinition,
  attr: p1.Directive,
  enums: { [name: string]: p1.EnumTypeDefinition }
): boolean {
  if (provider !== 'postgresql' || !enums[p1Field.type.named()]) {
    return false
  }
  const arg = attr.findArgument((a) => a.name === 'value')
  if (!arg || !arg.value || arg.value.kind !== 'EnumValue') {
    return false
  }
  return true
}

function getDefaultValueString(attr: p1.Directive): string | void {
  const arg = attr.findArgument((a) => a.name === 'value')
  if (!arg || !arg.value || arg.value.kind !== 'StringValue') return
  return arg.value.value
}

function getDefaultValueEnum(attr: p1.Directive): string | void {
  const arg = attr.findArgument((a) => a.name === 'value')
  if (!arg || !arg.value || arg.value.kind !== 'EnumValue') return
  return arg.value.value
}

function getPGSchema(url: string): string {
  const obj = uri.parse(url, true)
  if (obj.query['schema']) {
    return Array.isArray(obj.query['schema'])
      ? obj.query['schema'].join('')
      : obj.query['schema']
  }
  let pathname = obj.pathname || ''
  pathname = pathname.replace(/^\//, '')
  return pathname ? pathname.replace(/\//g, '$') : 'default$default'
}

// Turn a P1 datatype into a P2 datatype
// NOTE: This is not fully done, I've written as much as I needed to solve the problem.
// See TODO below.
function toP2Type(dt: p1.Type, optional: boolean = true): p2ast.DataType {
  switch (dt.kind) {
    case 'ListType':
      const listType: p2ast.ListType = {
        type: 'list_type',
        end: pos,
        start: pos,
        inner: toP2Type(dt.inner(), true),
      }
      if (!optional) {
        return listType
      }
      return {
        type: 'optional_type',
        end: pos,
        start: pos,
        inner: listType,
      }
    case 'NonNullType':
      return toP2Type(dt.inner(), false)
    case 'NamedType':
      // TODO: this should include other types like String
      const namedType: p2ast.ReferenceType = {
        type: 'reference_type',
        name: {
          type: 'identifier',
          name: dt.name,
          start: pos,
          end: pos,
        },
        start: pos,
        end: pos,
      }
      if (!optional) {
        return namedType
      }
      return {
        type: 'optional_type',
        end: pos,
        start: pos,
        inner: namedType,
      }
  }
}
