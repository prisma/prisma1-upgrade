import * as p1 from './'

import { Graph, json } from 'graphlib'

export type Edge = {
  name: string
  link: 'INLINE' | 'TABLE' | ''
  type: 'hasOne' | 'hasMany'
  from: p1.ObjectTypeDefinition
  to: p1.ObjectTypeDefinition
  fromField: p1.FieldDefinition
  toField: p1.FieldDefinition
}

export function load(schema: p1.Schema): Graph {
  const graph = new Graph({ directed: true })
  const defs = schema.definitions

  // set all the nodes
  for (let def of defs) {
    if (def instanceof p1.ObjectTypeDefinition) {
      for (let field of def.fields) {
        graph.setNode(def.name + '.' + field.name, def)
      }
    } else if (def instanceof p1.EnumTypeDefinition) {
      graph.setNode(def.name, def)
    }
  }

  for (let from of defs) {
    // connect models together via references
    if (!(from instanceof p1.ObjectTypeDefinition)) {
      continue
    }
    for (let fromField of from.fields) {
      if (!fromField.type.isReference()) {
        continue
      }
      const to = schema.findObject((o) => o.name === fromField.type.named())
      if (!to) {
        continue
      }
      const version = schema.version()
      // find the primary key
      let toField: p1.FieldDefinition | undefined
      for (let field of to.fields) {
        const isDM1Primary =
          version === '1.0' &&
          field.type.named() === 'ID' &&
          field.findDirective((d) => d.name === 'unique')
        const isDM11Primary =
          version === '1.1' && field.findDirective((d) => d.name === 'id')
        if (isDM1Primary || isDM11Primary) {
          toField = field
          break
        }
      }
      if (!toField) {
        continue
      }
      const fromFullName = from.name + '.' + fromField.name
      const toFullName = to.name + '.' + toField.name
      // if we have an @relation then we either were explicit with link
      // or it's an inline relation otherwise there's no specified link at all.
      let link: Edge['link'] = version === '1.0' ? 'TABLE' : ''
      const relation = fromField.directives.find((d) => d.name === 'relation')
      let relationName = ''
      if (relation) {
        // handle DM 1.0
        if (version !== '1.0') {
          const arg = relation.arguments.find((a) => a.name === 'link')
          if (arg && 'value' in arg.value && arg.value.value === 'TABLE') {
            link = 'TABLE'
          } else {
            link = 'INLINE'
          }
        }
        // handle @relation(name:"...")
        const nameArg = relation.findArgument((a) => a.name === 'name')
        if (nameArg && nameArg.value.kind === 'StringValue') {
          relationName = nameArg.value.value
        }
      }
      // check for the nodes
      if (!graph.hasNode(toFullName)) {
        throw new Error(`graph doesn't have a "${toFullName}" node`)
      } else if (!graph.hasNode(fromFullName)) {
        throw new Error(`graph doesn't have a "${fromFullName}" node`)
      }
      // is a has-one relationship
      if (hasOne(fromField.type)) {
        graph.setEdge(fromFullName, toFullName, <Edge>{
          name: relationName,
          type: 'hasOne',
          link: link,
          from: from,
          to: to,
          fromField: fromField,
          toField: toField,
        })
        continue
      }
      // is a has-many relationship
      if (hasMany(fromField.type)) {
        graph.setEdge(fromFullName, toFullName, <Edge>{
          name: relationName,
          type: 'hasMany',
          link: link,
          from: from,
          to: to,
          fromField: fromField,
          toField: toField,
        })
        continue
      }
    }
  }

  return graph
}

export function print(g: Graph): string {
  return JSON.stringify(json.write(g), null, '  ')
}

function hasOne(dt: p1.Type): boolean {
  switch (dt.kind) {
    case 'ListType':
      return false
    case 'NonNullType':
      return hasOne(dt.inner())
    case 'NamedType':
      return true
  }
}

function hasMany(dt: p1.Type): boolean {
  switch (dt.kind) {
    case 'ListType':
      return true
    case 'NonNullType':
      return hasMany(dt.inner())
    case 'NamedType':
      return false
  }
}
