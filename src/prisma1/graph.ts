import * as p1 from './'

import { Graph, json } from 'graphlib'

export type Edge = {
  link: 'INLINE' | 'TABLE' | ''
  type: 'hasOne' | 'hasMany'
  from: p1.ObjectTypeDefinition
  to: p1.ObjectTypeDefinition
  field: p1.FieldDefinition
}

export function load(schema: p1.Schema): Graph {
  const graph = new Graph({ directed: true })
  const defs = schema.definitions

  // set all the nodes
  for (let def of defs) {
    if (def instanceof p1.ObjectTypeDefinition) {
      graph.setNode(def.name, def)
    } else if (def instanceof p1.EnumTypeDefinition) {
      graph.setNode(def.name, def)
    }
  }

  for (let def of defs) {
    // connect models together via references
    if (def instanceof p1.ObjectTypeDefinition) {
      for (let field of def.fields) {
        if (!field.type.isReference()) {
          continue
        }
        const name = field.type.named()
        if (!graph.hasNode(name)) {
          throw new Error(`graph doesn't have a "${name}" node`)
        } else if (!graph.hasNode(def.name)) {
          throw new Error(`graph doesn't have a "${def.name}" node`)
        }
        // if we have an @relation
        // then we either were explicit with link
        // or it's an inline relation
        // otherwise there's no specified link at all.
        let link: Edge['link'] = ''
        const relation = field.directives.find((d) => d.name === 'relation')
        if (relation) {
          const arg = relation?.arguments.find((a) => a.name === 'link')
          if (
            arg &&
            arg.value.kind === 'StringValue' &&
            arg.value.value === 'TABLE'
          ) {
            link = 'TABLE'
          } else {
            link = 'INLINE'
          }
        }
        // is a has-one relationship
        if (hasOne(field.type)) {
          const to = schema.findObject((obj) => obj.name === name)
          graph.setEdge(def.name, name, <Edge>{
            type: 'hasOne',
            link: link,
            from: def,
            to: to,
            field: field,
          })
        }
        // is a has-many relationship
        if (hasMany(field.type)) {
          const to = schema.findObject((obj) => obj.name === name)
          graph.setEdge(def.name, name, <Edge>{
            type: 'hasMany',
            link: link,
            from: def,
            to: to,
            field: field,
          })
        }
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
