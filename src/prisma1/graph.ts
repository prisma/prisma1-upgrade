import Prisma1, {
  ObjectTypeDefinition,
  EnumTypeDefinition,
  Type,
  ListType,
  NonNullType,
  NamedType,
} from './'

import { Graph, json } from 'graphlib'

export type Edge = {
  link: 'INLINE' | 'TABLE' | ''
  type: 'hasOne' | 'hasMany'
  from: string
  to: string
  field: string
}

export function load(p1: Prisma1): Graph {
  const graph = new Graph({ directed: true })
  const defs = p1.definitions

  // set all the nodes
  for (let def of defs) {
    if (def instanceof ObjectTypeDefinition) {
      graph.setNode(def.name, def)
    } else if (def instanceof EnumTypeDefinition) {
      graph.setNode(def.name, def)
    }
  }

  for (let def of defs) {
    // connect models together via references
    if (def instanceof ObjectTypeDefinition) {
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
        //
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
          graph.setEdge(def.name, name, <Edge>{
            type: 'hasOne',
            link: link,
            from: def.name,
            to: name,
            field: field.name,
          })
        }
        // is a has-many relationship
        if (hasMany(field.type)) {
          graph.setEdge(def.name, name, <Edge>{
            type: 'hasMany',
            link: link,
            from: def.name,
            to: name,
            field: field.name,
          })
        }
      }
    }

    // console.log('kind', def.kind)
    // switch (def.kind) {
    //   case 'ObjectTypeDefinition':
    //     graph.setNode(def.name, def)
    //     break
    //   default:
    // }
    // switch (block.type) {
    //   case 'enum':
    //     graph.setNode(block.name, block)
    //     break
    //   case 'model':
    //     graph.setNode(block.name, block)
    //     models.push(block)
    //     break
    //   case 'type_alias':
    //     graph.setNode(block.name, block)
    //     break
    // }
  }

  return graph
}

export function print(g: Graph): string {
  return JSON.stringify(json.write(g), null, '  ')
}

function hasOne(dt: Type): boolean {
  if (dt instanceof ListType) {
    return false
  } else if (dt instanceof NonNullType) {
    return hasOne(dt.inner())
  } else if (dt instanceof NamedType) {
    return true
  }
  throw new Error(`hasOne: unknown type ${dt.toString()}`)
}

function hasMany(dt: Type): boolean {
  if (dt instanceof ListType) {
    return true
  } else if (dt instanceof NonNullType) {
    return hasMany(dt.inner())
  } else if (dt instanceof NamedType) {
    return false
  }
  throw new Error(`hasOne: unknown type ${dt.toString()}`)
}
