import * as p2ast from "prismafile/dist/ast"
import * as graph from "../prisma1/graph"
import * as p2 from "../prisma2"
import * as p1 from "../prisma1"
import * as uri from "url"
import * as sql from "../sql"
import { DataType } from "../prisma2"

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
  breakingOps: sql.Op[]
  idOps: sql.Op[]
}

// upgrade performs a set of rules
export async function upgrade(input: Input): Promise<Output> {
  const { prisma1, prisma2, url } = input
  const pgSchema = getPGSchema(url)
  const provider = prisma2.provider()
  const postgreSQL = provider === "postgres" || provider === "postgresql"
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
      // add @@map
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
            case "ID": // Rule 1: add @default(cuid()) for P1 ID types
              p2Field.upsertAttribute(defaultAttr(cuid()))
              break
            case "UUID": // Rule 2: @default(uuid()) for P1 UUID types
              p2Field.upsertAttribute(defaultAttr(uuid()))
              break
          }
          // next, we'll loop over the P1 attributes
          for (let p1Attr of p1Field.directives) {
            // G: @updatedAt is lost
            if (p1Attr.name === "updatedAt") {
              p2Field.upsertAttribute(updatedAt())
            }
            // MySQL only: defaults don't work for TEXT (and it's variants)
            // but they do work at the Prisma-level, so we'll provide them.
            if (isMySQLDefaultText(provider, p1Field, p1Attr)) {
              const value = getDefaultValueString(p1Attr)
              if (typeof value === "string") {
                p2Field.upsertAttribute(
                  defaultAttr({
                    type: "string_value",
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
                `Prisma 2+ doesn't support the Json data type with a default yet.

                See: https://github.com/prisma/prisma/issues/2556 for more information.`
              )
              continue
            }
          }
        }
      }
    }
  }

  const ops: sql.Op[] = []
  const breakingOps: sql.Op[] = []

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
      if (p1Field.type.named() === "Json" && !isJsonType(p2Field)) {
        if (postgreSQL) {
          breakingOps.push({
            type: "SetJsonTypeOp",
            schema: pgSchema,
            p1Model,
            p1Field,
          })
        } else {
          ops.push({
            type: "SetJsonTypeOp",
            schema: pgSchema,
            p1Model,
            p1Field,
          })
        }
      }

      // J: Singular Enum is a simple String
      const p1Enum = p1Enums[p1Field.type.named()]
      const p2Enum = p2Enums[p2Field.type.innermost().toString()]
      if (p1Enum && !p2Enum) {
        if (postgreSQL) {
          breakingOps.push({
            type: "SetEnumTypeOp",
            schema: pgSchema,
            p1Model,
            p1Field,
            p1Enum,
          })
        } else {
          ops.push({
            type: "SetEnumTypeOp",
            schema: pgSchema,
            p1Model,
            p1Field,
            p1Enum,
          })
        }
      }

      // loop over attributes
      for (let p1Attr of p1Field.directives) {
        // A: @default value is missing
        if (p1Attr.name === "default") {
          const p1Arg = p1Attr.findArgument((a) => a.name === "value")
          if (!p1Arg) {
            continue
          }
          const p2Attr = p2Field.findAttribute((a) => a.name === "default")
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
            type: "SetDefaultOp",
            schema: pgSchema,
            p1Model,
            p1Field,
            p1Attr,
            p1Enum,
          })
        }
        // we found a @createdAt in P1 and it's not in P2
        if (p1Attr.name === "createdAt") {
          // maybe add the SQL command if we don't already have @default(now)
          if (!hasDefaultNow(p2Field)) {
            ops.push({
              type: "SetCreatedAtOp",
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

  // Handle scalar lists
  if (postgreSQL) {
    for (let p1Model of prisma1.objects) {
      const p2Model = prisma2.findModel((m) => m.name === p1Model.name)
      if (!p2Model) {
        continue
      }
      for (let p1Field of p1Model.fields) {
        if (!p1Field.type.list()) {
          continue
        }
        // already been applied
        const p2Field = p2Model.findField((f) => f.name === p1Field.name)
        if (p2Field) {
          continue
        }
        if (p1Field.type.isReference()) {
          let p1Enum: p1.EnumTypeDefinition | undefined
          p1Enum = prisma1.enums.find((e) => p1Field.type.named() === e.name)
          if (!p1Enum) {
            continue
          }
          breakingOps.push({
            type: "MigrateEnumListOp",
            schema: pgSchema,
            p1Model: p1Model,
            p1Field: p1Field,
            p1Enum: p1Enum,
          })
        } else {
          breakingOps.push({
            type: "MigrateScalarListOp",
            schema: pgSchema,
            p1Model: p1Model,
            p1Field: p1Field,
          })
        }
        // remove the P2 scalar since we've dropped it in the operation
        const p2ModelList = prisma2.findModel((m) => {
          return m.name === `${p1Model.name}_${p1Field.name}`
        })
        if (p2ModelList) {
          // p2ModelList.remove()
        }
      }
    }
  }

  // B: 1-1 relations Datamodel v1.1
  // loop over edges and apply back-relation rules
  // to break up cycles and place the fields in the proper place
  const g = graph.load(prisma1)
  const edges = g.edges()
  const relations: [graph.Edge, graph.Edge][] = []
  const named: { [name: string]: graph.Edge[] } = {}
  // first try matching up edges by their @relation(name)
  for (let i = 0; i < edges.length; i++) {
    const edge = g.edge(edges[i].v, edges[i].w)
    // skip edges without names, we'll cover them next
    if (!edge.name) {
      continue
    }
    if (!named[edge.name]) {
      named[edge.name] = []
    }
    named[edge.name].push(edge)
  }
  for (let k in named) {
    // skip
    if (named[k].length !== 2) {
      continue
    }
    relations.push([named[k][0], named[k][1]])
  }
  const backrelations: { [name: string]: graph.Edge[] } = {}
  // second, match by back-relations
  for (let i = 0; i < edges.length; i++) {
    const edge = g.edge(edges[i].v, edges[i].w)
    // skip edges with names since we covered them in the last step
    if (edge.name) {
      continue
    }
    const id = [edge.from.name, edge.to.name].sort().join(" ")
    if (!backrelations[id]) {
      backrelations[id] = []
    }
    backrelations[id].push(edge)
  }
  for (let k in backrelations) {
    // skip
    if (backrelations[k].length !== 2) {
      continue
    }
    relations.push([backrelations[k][0], backrelations[k][1]])
  }
  // loop over the edges and establish relationships
  for (let [edge1, edge2] of relations) {
    // 1:1 relationship
    if (!isInlineOneToOne(edge1, edge2)) {
      continue
    }
    // alphanumeric sorting
    const uniqueEdge = findUniqueEdge(edge1, edge2)

    // add constraint if it's not a 1-to-1 already
    if (!isOneToOne(prisma2, uniqueEdge)) {
      ops.push({
        type: "AddUniqueConstraintOp",
        schema: pgSchema,
        table: uniqueEdge.from.name,
        column: uniqueEdge.fromField.name,
      })
    }

    // L: 1-1 relation with both sides required details
    const p2Field1 = prisma2.findField((m, f) => edge1.from.name === m.name && edge1.to.name === f.name)
    if (p2Field1) {
      p2Field1.setType(toP2Type(edge1.fromField.type))
    }
    const p2Field2 = prisma2.findField((m, f) => edge2.from.name === m.name && edge2.to.name === f.name)
    if (p2Field2) {
      p2Field2.setType(toP2Type(edge2.fromField.type))
    }
  }

  // C: All Table relations are represented as m-n
  // Migrate to 1:N
  for (let [edge1, edge2] of relations) {
    // console.log(
    //   edge1.from.name,
    //   edge1.field.name,
    //   '->',
    //   edge2.from.name,
    //   edge2.field.name
    // )
    if (!isTableHasMany(edge1, edge2)) {
      continue
    }
    // 1:N relationship
    const hasOne = edge1.type === "hasOne" ? edge1 : edge2
    const hasMany = edge1.type === "hasMany" ? edge1 : edge2

    // skip if is one to many already
    if (isOneToMany(prisma2, hasOne)) {
      continue
    }
    // get the ID field
    const hasManyFieldID = hasMany.from.fields.find((f) => f.type.named() === "ID")
    if (!hasManyFieldID) {
      continue
    }
    // get the ID field
    const hasOneFieldID = hasOne.from.fields.find((f) => f.type.named() === "ID")
    if (!hasOneFieldID) {
      continue
    }

    breakingOps.push({
      type: "MigrateHasManyOp",
      schema: pgSchema,
      p1ModelOne: hasOne.from,
      p1FieldOne: hasOne.fromField,
      p1FieldOneID: hasOneFieldID,
      p1ModelMany: hasMany.from,
      p1FieldManyID: hasManyFieldID,
      joinTableName: joinTableName(edge1.from, edge1.fromField, edge2.from, edge2.fromField),
    })
  }

  // C: All Table relations are represented as m-n
  // Migrate to 1:1
  for (let [edge1, edge2] of relations) {
    // 1:1 relationship
    if (!isTableHasOne(edge1, edge2)) {
      continue
    }
    const hasOne = edge1
    const hasOneOther = edge2
    // skip if is one to many already
    if (isTableOneToOne(prisma2, edge1, edge2)) {
      continue
    }
    // get the ID field
    const hasOneFieldID = hasOne.from.fields.find((f) => f.type.named() === "ID")
    if (!hasOneFieldID) {
      continue
    }
    // get the ID field
    const hasOneOtherFieldID = hasOneOther.from.fields.find((f) => f.type.named() === "ID")
    if (!hasOneOtherFieldID) {
      continue
    }
    if (!isTableOneToOne(prisma2, hasOne, hasOneOther)) {
      breakingOps.push({
        type: "MigrateOneToOneTableOp",
        schema: pgSchema,
        p1ModelOne: hasOne.from,
        p1ModelOther: hasOneOther.from,
        p1FieldOne: hasOne.fromField,
        p1FieldOneID: hasOneFieldID,
        p1FieldOtherID: hasOneOtherFieldID,
        joinTableName: joinTableName(edge1.from, edge1.fromField, edge2.from, edge2.fromField),
      })
      continue;
    }
    // L: 1-1 relation with both sides required details
    const p2Field1 = prisma2.findField((m, f) => edge1.from.name === m.name && edge1.to.name === f.name)
    if (p2Field1) {
      p2Field1.setType(toP2Type(edge1.fromField.type))
    }
    const p2Field2 = prisma2.findField((m, f) => edge2.from.name === m.name && edge2.to.name === f.name)
    if (p2Field2) {
      p2Field2.setType(toP2Type(edge2.fromField.type))
    }
  }


  // loop over the edges and rewrite relations from nullable fields
  for (let [edge1, edge2] of relations) {
    // 1:1 relationship
    if (!isInlineOneToOne(edge1, edge2)) {
      continue
    }

    // L: 1-1 relation with both sides required details
    const p2Field1 = prisma2.findField((m, f) => edge1.from.name === m.name && edge1.to.name === f.name);
    const p2Field2 = prisma2.findField((m, f) => edge2.from.name === m.name && edge2.to.name === f.name);

    if (p2Field1 && p2Field2 && (p2Field1.type.optional() != p2Field2.type.optional())) {
      const createSwappedRelation = (relation: p2.Attribute) => {
        const fieldsArg = relation.arguments.find(arg => arg.key === 'fields')?.['n'];
        const referencesArg = relation.arguments.find(arg => arg.key === 'references')?.['n'];

        if (!fieldsArg || !referencesArg) {
          return relation['n'];
        }

        return {
          ...relation['n'],
          arguments: [
            { ...referencesArg, name: (fieldsArg as p2ast.KeyedArgument).name },
            { ...fieldsArg, name: (referencesArg as p2ast.KeyedArgument).name },
            ...relation.arguments.filter((arg) => !['fields', 'references'].includes(arg.key ?? '')).map((argument) => argument['n']),
          ]
        };
      }

      const field1Relation = p2Field1.findAttribute(({ name }) => name === "relation");
      const field2Relation = p2Field2.findAttribute(({ name }) => name === "relation");

      if (p2Field1.type.optional() && field1Relation) {
        p2Field2.upsertAttribute(createSwappedRelation(field1Relation));
        p2Field1.removeAttribute(({ name }) => name === "relation");
      }

      if (p2Field2.type.optional() && field2Relation) {
        p2Field1.upsertAttribute(createSwappedRelation(field2Relation));
        p2Field2.removeAttribute(({ name }) => name === "relation");
      }
    }
  }

  // Migrate INLINE has-many relations with NOT NULL
  // on both sides
  for (let [edge1, edge2] of relations) {
    // 1:1 relationship
    if (!isInlineRequiredHasMany(edge1, edge2)) {
      continue
    }
    const hasOne = edge1.type === "hasOne" ? edge1 : edge2
    // skip over ops that have already been applied
    const p2Field = prisma2.findField((m, f) => hasOne.from.name === m.name && hasOne.to.name === f.name)
    if (!p2Field || !p2Field.type.optional()) {
      continue
    }
    // const hasMany = edge1.type === 'hasMany' ? edge1 : edge2
    breakingOps.push({
      type: "MigrateRequiredHasManyOp",
      schema: pgSchema,
      p1HasOneModel: hasOne.from,
      p1HasOneField: hasOne.fromField,
      p1HasManyModel: hasOne.to,
      p1HasManyField: hasOne.toField,
    })
  }

  // Migrate varchar(25) => varchar(30)
  const idOps: sql.Op[] = []
  let idOp: sql.AlterIDsOp = {
    type: "AlterIDsOp",
    schema: pgSchema,
    pairs: [],
  }
  for (let model of prisma2.models) {
    for (let field of model.fields) {
      const attributeWithID = field.findAttribute((a) => a.name === "id")
      if (attributeWithID) {
        const type = field.type.innermost().toString()
        if (type !== "String") {
          continue
        }
        if (field.name === "nodeId") {
          continue
        }
        idOp.pairs.push({ model, field })
        continue
      }
      const attributeWithRelation = field.findAttribute((a) => a.name === "relation")
      if (attributeWithRelation) {
        const fieldName = getFieldName(attributeWithRelation)
        if (!fieldName) {
          continue
        }
        let scalar = model.findField((f) => f.name === fieldName)
        if (!scalar) {
          continue
        }
        const type = scalar.type.innermost().toString()
        if (type !== "String") {
          continue
        }
        idOp.pairs.push({ model, field: scalar })
        continue
      }
    }
  }
  if (idOp.pairs.length) {
    idOps.push(idOp)
  }

  // Lastly, we'll try to rename relationships
  for (let p1Model of models) {
    // find the corresponding p2 model
    for (let p2Model of prisma2.models) {
      if (p2Model.name !== p1Model.dbname) {
        continue
      }

      syncFields(p1Model, p2Model, prisma2);
    }
  }

  return {
    schema: prisma2,
    warnings,
    ops,
    breakingOps,
    idOps,
  }
}

const pos = { column: 0, line: 0, offset: 0 }

function ident(name: string): p2ast.Identifier {
  return {
    type: "identifier",
    name: name,
    end: pos,
    start: pos,
  }
}

function defaultAttr(value: p2ast.Value): p2ast.Attribute {
  return {
    type: "attribute",
    name: ident("default"),
    end: pos,
    start: pos,
    arguments: [
      {
        type: "unkeyed_argument",
        end: pos,
        start: pos,
        value,
      },
    ],
  }
}

function updatedAt(): p2ast.Attribute {
  return {
    type: "attribute",
    name: ident("updatedAt"),
    end: pos,
    start: pos,
    arguments: [],
  }
}

function defaultNow(): p2ast.Attribute {
  return defaultAttr({
    type: "function_value",
    name: {
      type: "identifier",
      name: "now",
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
    type: "function_value",
    name: ident("cuid"),
    arguments: [],
    end: pos,
    start: pos,
  }
}

// uuid()
function uuid(): p2ast.FunctionValue {
  return {
    type: "function_value",
    name: ident("uuid"),
    arguments: [],
    end: pos,
    start: pos,
  }
}

function hasExpectedDefault(p1Arg: p1.Argument, p2Arg?: p2.Argument): boolean {
  if (!p2Arg) return false
  switch (p1Arg.value.kind) {
    case "BooleanValue":
      return p2Arg.value.type === "boolean_value"
    case "EnumValue":
      return p2Arg.value.type === "reference_value"
    case "FloatValue":
      return p2Arg.value.type === "float_value"
    case "IntValue":
      return p2Arg.value.type === "int_value"
    case "ListValue":
      return p2Arg.value.type === "list_value"
    case "ObjectValue":
      return p2Arg.value.type === "map_value"
    case "StringValue":
      return p2Arg.value.type === "string_value"
    case "Variable":
      return p2Arg.value.type === "function_value"
    // TODO: these are unhandled values
    case "NullValue":
      return false
  }
}

function hasDefaultNow(field: p2.Field): boolean {
  const attr = field.findAttribute((a) => a.name === "default")
  if (!attr) return false
  return attr.toString() === "@default(now())"
}

function isOneToOne(schema: p2.Schema, edge: graph.Edge): boolean {
  const fromModel = schema.findModel((m) => m.name === edge.from.name)
  if (!fromModel) return false
  const fromField = fromModel.findField((f) => f.name === edge.fromField.name)
  if (!fromField) return false
  const uniqueAttr = fromField.findAttribute((a) => a.name === "unique")
  if (!uniqueAttr) return false
  const toModel = schema.findModel((m) => m.name === edge.to.name)
  if (!toModel) return false
  const toField = toModel.findField((f) => f.name === edge.from.name)
  if (!toField) return false
  if (!toField.type.optional) return false
  return true
}

function isTableOneToOne(schema: p2.Schema, from: graph.Edge, to: graph.Edge): boolean {
  const fromModel = schema.findModel((m) => m.name === from.from.name)
  if (!fromModel) {
    return false
  }
  const toModel = schema.findModel((m) => m.name === to.from.name)
  if (!toModel) {
    return false
  }
  const fromField = fromModel.findField((m) => m.name === toModel.name)
  if (!fromField) {
    return false
  }
  const toField = toModel.findField((m) => m.name === fromModel.name)
  if (!toField) {
    return false
  }
  if (fromField.type.list()) {
    return false
  }
  if (toField.type.list()) {
    return false
  }
  return true
}

function isOneToMany(schema: p2.Schema, hasOneEdge: graph.Edge): boolean {
  const model = schema.findModel((m) => m.name === hasOneEdge.from.name)
  if (!model) {
    return false
  }
  const field = model.findField((f) => f.name === hasOneEdge.fromField.name + "Id")
  if (!field) {
    return false
  }
  return true
}

function isInlineOneToOne(edge1: graph.Edge, edge2: graph.Edge): boolean {
  return edge1.type === "hasOne" && edge1.link !== "TABLE" && edge2.type === "hasOne" && edge2.link !== "TABLE"
}

// find the edge to stick UNIQUE on
function findUniqueEdge(edge1: graph.Edge, edge2: graph.Edge): graph.Edge {
  if (edge1.link === "INLINE" && edge2.link !== "INLINE") {
    return edge1
  }
  if (edge1.link !== "INLINE" && edge2.link === "INLINE") {
    return edge2
  }
  return edge1.from.name > edge2.from.name ? edge1 : edge2
}

function isTableHasMany(edge1: graph.Edge, edge2: graph.Edge): boolean {
  const isHasMany =
    (edge1.type === "hasOne" && edge2.type === "hasMany") || (edge1.type === "hasMany" && edge2.type === "hasOne")
  const isTable = edge1.link === "TABLE" || edge2.link === "TABLE"
  return isHasMany && isTable
}

function isInlineRequiredHasMany(edge1: graph.Edge, edge2: graph.Edge): boolean {
  const hasOne = edge1.type === "hasOne" ? edge1 : edge2.type === "hasOne" ? edge2 : null
  if (!hasOne) {
    return false
  }
  if (hasOne.fromField.optional()) {
    return false
  }
  const isHasMany =
    (edge1.type === "hasOne" && edge2.type === "hasMany") || (edge1.type === "hasMany" && edge2.type === "hasOne")
  if (!isHasMany) {
    return false
  }
  const isInline = edge1.link !== "TABLE" && edge2.link !== "TABLE"
  if (!isInline) {
    return false
  }
  // ensure it's not a self-relation because self-relations
  // must be optional otherwise you can't create one
  if (edge1.from.name === edge1.to.name) {
    return false
  }
  return true
}

function isTableHasOne(edge1: graph.Edge, edge2: graph.Edge): boolean {
  const isHasOne = edge1.type === "hasOne" && edge2.type === "hasOne"
  const isTable = edge1.link === "TABLE" || edge2.link === "TABLE"
  return isHasOne && isTable
}

function isJsonType(field: p2.Field): boolean {
  return field.type.innermost().toString() === "Json"
}

function isMySQLDefaultText(provider: string, field: p1.FieldDefinition, directive: p1.Directive): boolean {
  return (
    provider === "mysql" &&
    field.type.named() === "String" &&
    directive.name === "default" &&
    !!directive.findArgument((arg) => arg.name === "value")
  )
}

function isMySQLDefaultJson(provider: string, field: p1.FieldDefinition, directive: p1.Directive): boolean {
  return (
    provider === "mysql" &&
    field.type.named() === "Json" &&
    directive.name === "default" &&
    !!directive.findArgument((arg) => arg.name === "value")
  )
}

function getDefaultValueString(attr: p1.Directive): string | void {
  const arg = attr.findArgument((a) => a.name === "value")
  if (!arg || !arg.value || arg.value.kind !== "StringValue") return
  return arg.value.value
}

function getPGSchema(url: string): string {
  const obj = uri.parse(url, true)
  if (obj.query["schema"]) {
    return Array.isArray(obj.query["schema"]) ? obj.query["schema"].join("") : obj.query["schema"]
  }
  let pathname = obj.pathname || ""
  pathname = pathname.replace(/^\//, "")
  return pathname ? pathname.replace(/\//g, "$") : "default$default"
}

// Turn a P1 datatype into a P2 datatype
// NOTE: This is not fully done, I've written as much as I needed to solve the problem.
// See TODO below.
function toP2Type(dt: p1.Type, optional: boolean = true): p2ast.DataType {
  switch (dt.kind) {
    case "ListType":
      const listType: p2ast.ListType = {
        type: "list_type",
        end: pos,
        start: pos,
        inner: toP2Type(dt.inner()!, true),
      }
      if (!optional) {
        return listType
      }
      return {
        type: "optional_type",
        end: pos,
        start: pos,
        inner: listType,
      }
    case "NonNullType":
      return toP2Type(dt.inner()!, false)
    case "NamedType":
      // TODO: this should include other types like String
      const namedType: p2ast.NamedType = {
        type: "named_type",
        name: {
          type: "identifier",
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
        type: "optional_type",
        end: pos,
        start: pos,
        inner: namedType,
      }
  }
}

function joinTableName(
  a: p1.ObjectTypeDefinition,
  af: p1.FieldDefinition,
  b: p1.ObjectTypeDefinition,
  bf: p1.FieldDefinition
): string {
  const ta = a.name < b.name ? `_${a.name}To${b.name}` : `_${b.name}To${a.name}`
  const ar = af.findDirective((d) => d.name === "relation")
  const br = bf.findDirective((d) => d.name === "relation")
  if (!ar || !br) {
    return ta
  }
  const an = ar.findArgument((a) => a.name === "name")
  const bn = br.findArgument((a) => a.name === "name")
  if (!an || !bn) {
    return ta
  }
  const av = an.value.kind === "StringValue" ? an.value.value : ""
  const bv = bn.value.kind === "StringValue" ? bn.value.value : ""
  if (!av || !bv || av !== bv) {
    return ta
  }
  return "_" + av
}

function getFieldName(a: p2.Attribute): string | undefined {
  const arg = a.arguments.find((a) => a.key === "fields")
  if (!arg) {
    return
  }
  const value = arg.value
  if (value.type !== "list_value") {
    return
  }
  const inner = value.values[0]
  if (!inner || inner.type !== "reference_value") {
    return
  }
  return inner.name.name
}

const getArgumentName = (a: p2.Attribute, argumentKey: string) => {
  const arg = a.arguments.find(({ key }) => key === argumentKey);
  if (!arg) {
    return
  }
  const value = arg.value;
  if (value.type !== "list_value") {
    return
  }
  const inner = value.values[0];
  if (!inner || inner.type !== "reference_value") {
    return
  }
  return inner.name.name
}

const updateRelationArguments = (field: p2.Field, argumentKeys: string[], oldValue: string, newValue: string) => {
  const attributeWithRelation = field.findAttribute((a) => a.name === "relation");
  if (!attributeWithRelation) {
    return;
  }

  argumentKeys.forEach((argKey) => {
    const fieldName = getArgumentName(attributeWithRelation, argKey);

    if (fieldName === newValue || fieldName !== oldValue) {
      return;
    }
  
    const arg = attributeWithRelation.arguments.find(({ key }) => key === argKey);

    if (!arg) {
      return;
    }

    const { value: { values: [existingArg] } } = arg;

    arg.value.values = [{...existingArg, name: { name: newValue }}];
  });
};

const syncFields = (p1Model: p1.ObjectTypeDefinition, p2Model: p2.Model, p2Schema: p2.Schema) => {
  const matchedFields = new Set();
  for (let p2Field of p2Model.fields) {
    if (!p2Field.type.isReference()) {
      continue
    }
    const candidateMatchesByType = p1Model
      .fields
      .filter(p1Field => !matchedFields.has(p1Field.name))
      .filter(p1Field => fieldTypesMatch(p1Field, p2Field));

    if (candidateMatchesByType.length === 1) {
      const [p1Field] = candidateMatchesByType;
      // look for any conflicts
      for (let p2Field of p2Model.fields) {
        // type check here in case we are running over an already converted schema
        if (p1Field.name === p2Field.name && !fieldTypesMatch(p1Field, p2Field)) {
          setAsId(p2Field, p2Model, p2Schema);
          break
        }
      }

      syncRelationship(p1Field, p2Field);
      matchedFields.add(p1Field.name);
      continue;
    }

    for (let p1Field of p1Model.fields) {
      if (matchedFields.has(p1Field.name)) {
        continue
      }
      if (fieldTypesMatch(p1Field, p2Field)) {
        // look for any conflicts
        for (let p2Field of p2Model.fields) {
          if (p1Field.name === p2Field.name && !fieldTypesMatch(p1Field, p2Field)) {
            setAsId(p2Field, p2Model, p2Schema);
            break
          }
        }

        if (fieldNamesMatch(p1Field, p2Field)) {
          syncRelationship(p1Field, p2Field);
          matchedFields.add(p1Field.name);
          break;
        }
      }
    }
  }
}

const getInnermostType = (p1Type: p1.Type): p1.NamedType => {
  if (!p1Type.optional() || p1Type.list()) {
    return getInnermostType((p1Type as p1.ListType | p1.NonNullType).inner()!);
  }

  return (p1Type as p1.NamedType);
}

const syncRelationship = (p1Field: p1.FieldDefinition, p2Field: p2.Field) => {
  p2Field.setName(p1Field.name);
  const p2Type = toP2Type(getInnermostType(p1Field.type), false);
  p2Field.type.setInnermostType(p2Type);
}

const setAsId = (p2Field: p2.Field, p2Model: p2.Model, p2Schema: p2.Schema) => {
  const originalName = p2Field.name;
  const newName = p2Field.name + "Id"
  p2Field.rename(newName);
  // update fields in relations affected by this
  p2Model
    .fields
    .filter(({ name }) => name !== newName)
    .forEach(field => updateRelationArguments(field, ['fields', 'references'], originalName, newName));

  p2Schema.models
    .filter(model => model !== p2Model)
    .forEach(model => model.fields
      .forEach(field => updateRelationArguments(field, ['fields', 'references'], originalName, newName))
    );
}

const fieldNamesMatch = (p1Field: p1.FieldDefinition, p2Field: p2.Field) => {
  const toTypeEnding = `${p1Field.name}To${p1Field.type.named()}`;
  return p2Field.name.endsWith(p1Field.name) || p2Field.name.endsWith(toTypeEnding);
}

const fieldTypesMatch = (p1Field: p1.FieldDefinition, p2Field: p2.Field) => {
  if (!p1Field.type.isReference() || !p2Field.type.isReference()) {
    return false;
  }

  const p1Type = p1Field.type.named()
  const p2Type = p2Field.type.innermost().toString()
  return p1Type === p2Type;
}