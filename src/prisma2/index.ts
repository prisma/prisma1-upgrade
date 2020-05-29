import * as ast from 'prismafile/dist/ast'
import { parse, print } from 'prismafile'
import url from 'url'

const pos = {
  offset: 0,
  line: 0,
  column: 0,
}

export class Schema {
  private readonly n: ast.Schema

  constructor(p2: string) {
    this.n = parse(p2)
  }

  get datasources(): Datasource[] {
    let dss: ast.DataSource[] = []
    for (let block of this.n.blocks) {
      if (block.type === 'datasource') {
        dss.push(block)
      }
    }
    return dss.map((ds) => new Datasource(ds))
  }

  get models(): Model[] {
    let dss: ast.Model[] = []
    for (let block of this.n.blocks) {
      if (block.type === 'model') {
        dss.push(block)
      }
    }
    return dss.map((ds) => new Model(ds))
  }

  // return the provider
  provider(): string {
    const datasource = this.datasources[0]
    if (!datasource) {
      throw new Error(
        'The Prisma 2 schema must contain a datasource configuration'
      )
    }
    // find the prisma2 datasource provider
    const provider = datasource.provider
    if (!provider) {
      throw new Error('The Prisma 2 datasource must contain a provider')
    }
    return provider
  }

  // needed for adjusting the test database
  setURL(url: string) {
    const datasource = this.datasources[0]
    if (!datasource) {
      throw new Error(
        'The Prisma 2 schema must contain a datasource configuration'
      )
    }
    datasource.url = url
  }

  // return the first url
  url(): string {
    const datasource = this.datasources[0]
    if (!datasource) {
      throw new Error(
        'The Prisma 2 schema must contain a datasource configuration'
      )
    }
    const url = datasource.url
    if (!url) {
      throw new Error('The Prisma 2 datasource must contain a url')
    }
    return url
  }

  // primarily useful for postgres
  schema(): string {
    const u = this.url()
    const o = url.parse(u, true)
    return String(o.query['schema'] || '')
  }

  findModel(fn: (m: Model) => boolean): Model | void {
    for (let model of this.models) {
      if (fn(model)) {
        return model
      }
    }
  }

  findField(fn: (m: Model, f: Field) => boolean): Field | void {
    for (let model of this.models) {
      for (let field of model.fields) {
        if (fn(model, field)) {
          return field
        }
      }
    }
  }

  findAttribute(
    fn: (m: Model, f: Field, a: Attribute) => boolean
  ): Attribute | void {
    for (let model of this.models) {
      for (let field of model.fields) {
        for (let attr of field.attributes) {
          if (fn(model, field, attr)) {
            return attr
          }
        }
      }
    }
  }

  toString(): string {
    return print(this.n)
  }
}

export class Datasource {
  constructor(private readonly node: ast.DataSource) {}

  get provider(): string | undefined {
    const provider = this.node.assignments.find(
      (assignment) => assignment.key.name === 'provider'
    )
    if (!provider) return
    switch (provider.value.type) {
      case 'string_value':
        return provider.value.value
      default:
        throw new Error(
          `datasource ${
            this.node.name
          } "provider" attribute must be a string, but got ${
            provider.value.type
          }`
        )
    }
  }

  get url(): string | undefined {
    const url = this.node.assignments.find((a) => a.key.name === 'url')
    if (!url) return
    const value = url.value
    switch (value.type) {
      case 'string_value':
        return value.value
      default:
        throw new Error(
          `datasource ${
            this.node.name
          } "url" attribute must be a string, but got ${url.value.type}`
        )
    }
  }

  set url(url: string | undefined) {
    if (!url) return
    const a = this.node.assignments.find((a) => a.key.name === 'url')
    if (!a) {
      this.node.assignments.push({
        type: 'assignment',
        start: pos,
        end: pos,
        key: {
          type: 'identifier',
          name: 'url',
          start: pos,
          end: pos,
        },
        value: {
          type: 'string_value',
          value: url,
          start: pos,
          end: pos,
        },
      })
      return
    }
    a.value = {
      type: 'string_value',
      value: url,
      start: a.value.start,
      end: a.value.end,
    }
  }

  // private Value(n: ast.Value): string {
  //   switch (n.type) {
  //     case 'boolean_value':
  //       return this.BooleanValue(n)
  //     case 'datetime_value':
  //       return this.DateTimeValue(n)
  //     case 'float_value':
  //       return this.FloatValue(n)
  //     case 'function_value':
  //       return this.FunctionValue(n)
  //     case 'int_value':
  //       return this.IntValue(n)
  //     case 'list_value':
  //       return this.ListValue(n)
  //     case 'map_value':
  //       return this.MapValue(n)
  //     case 'string_value':
  //       return this.StringValue(n)
  //     case 'reference_value':
  //       return this.ReferenceValue(n)
  //     default:
  //       throw new Error(`unhandled value ${n!.type}`)
  //   }
  // }

  // private BooleanValue(n: ast.BooleanValue): string {
  //   return String(n.value)
  // }

  // private DateTimeValue(n: ast.DateTimeValue): string {
  //   return n.value.toISOString()
  // }

  // private FloatValue(n: ast.FloatValue): string {
  //   return String(n.value)
  // }

  // private FunctionValue(n: ast.FunctionValue): string {
  //   return `${this.Identifier(n.name)}(${(n.arguments || [])
  //     .map((n) => this.Value(n))
  //     .join(', ')})`
  // }

  // private IntValue(n: ast.IntValue): string {
  //   return String(n.value)
  // }

  // private ListValue(n: ast.ListValue): string {
  //   let arr: string = '['
  //   arr += n.values.map((v) => this.Value(v)).join(', ')
  //   arr += ']'
  //   return arr
  // }

  // private MapValue(n: ast.MapValue): string {
  //   let obj: string = '{'
  //   for (let k in n.map) {
  //     obj += `${k}: ${this.Value(n.map[k])},`
  //   }
  //   obj += '}'
  //   return obj
  // }

  // private StringValue(n: ast.StringValue): string {
  //   return '"' + n.value + '"'
  // }

  // private ReferenceValue(n: ast.ReferenceValue): string {
  //   return this.Identifier(n.name)
  // }

  // private Identifier(n: ast.Identifier): string {
  //   return n.name
  // }
}

export class Model {
  constructor(private readonly n: ast.Model) {}
  get name(): string {
    return this.n.name.name
  }

  get fields(): Field[] {
    let fields: ast.Field[] = []
    for (let prop of this.n.properties) {
      if (prop.type === 'field') {
        fields.push(prop)
      }
    }
    return fields.map((n) => new Field(n))
  }

  findField(fn: (f: Field) => boolean): Field | void {
    for (let field of this.fields) {
      if (fn(field)) {
        return field
      }
    }
  }
}

export class Field {
  constructor(private readonly n: ast.Field) {}
  get name(): string {
    return this.n.name.name
  }
  get type(): DataType {
    return new DataType(this.n.datatype)
  }
  get attributes(): Attribute[] {
    return this.n.attributes.map((n) => new Attribute(n))
  }

  findAttribute(fn: (a: Attribute) => boolean): Attribute | void {
    for (let attr of this.attributes) {
      if (fn(attr)) {
        return attr
      }
    }
  }

  upsertAttribute(a: ast.Attribute) {
    for (let i = 0; i < this.n.attributes.length; i++) {
      const attr = this.n.attributes[i]
      if (attr.name.name !== a.name.name) {
        continue
      }
      this.n.attributes[i] = a
      return
    }
    // console.log('inserting', a.name)
    this.n.attributes.push(a)
    return
  }

  removeAttribute(fn: (a: Attribute) => boolean): void {
    const attrs = this.attributes
    for (let i = 0; i < attrs.length; i++) {
      if (fn(attrs[i])) {
        this.n.attributes.splice(i, 1)
      }
    }
  }
}

export class DataType {
  constructor(private readonly n: ast.DataType) {}

  get optional(): boolean {
    return this.n.type === 'optional_type'
  }

  innermost(): DataType {
    switch (this.n.type) {
      case 'optional_type':
      case 'list_type':
        return new DataType(this.n.inner)
      default:
        return this
    }
  }

  toString(): string {
    return this.DataType(this.n)
  }

  // datatype printer
  private DataType(n: ast.DataType): string {
    switch (n.type) {
      case 'list_type':
        return `${this.DataType(n.inner)}[]`
      case 'optional_type':
        return `${this.DataType(n.inner)}?`
      case 'reference_type':
        return `${this.ReferenceType(n)}`
      case 'string_type':
        return this.StringType(n)
      case 'boolean_type':
        return this.BooleanType(n)
      case 'datetime_type':
        return this.DateTimeType(n)
      case 'int_type':
        return this.IntType(n)
      case 'float_type':
        return this.FloatType(n)
      case 'json_type':
        return this.JsonType(n)
      default:
        throw new Error(`Unhandled Datatype: ${n!.type}`)
    }
  }
  private ReferenceType(n: ast.ReferenceType): string {
    return this.Identifier(n.name)
  }
  private StringType(n: ast.StringType): string {
    return n.name
  }
  private BooleanType(n: ast.BooleanType): string {
    return n.name
  }
  private DateTimeType(n: ast.DateTimeType): string {
    return n.name
  }
  private IntType(n: ast.IntType): string {
    return n.name
  }
  private FloatType(n: ast.FloatType): string {
    return n.name
  }
  private JsonType(n: ast.JsonType): string {
    return n.name
  }
  private Identifier(n: ast.Identifier): string {
    return n.name
  }
}

export class Attribute {
  constructor(private readonly n: ast.Attribute) {}
  get name(): string {
    return this.n.name.name
  }

  get arguments(): Argument[] {
    return this.n.arguments.map((n) => new Argument(n))
  }

  toString(): string {
    return this.FieldAttribute(this.n)
  }

  // TODO: move all this into the printer
  private FieldAttribute(n: ast.Attribute): string {
    const name = n.group
      ? `${n.group}.${this.Identifier(n.name)}`
      : this.Identifier(n.name)
    if (!n.arguments.length) {
      return `@${name}`
    }
    return `@${name}(${n.arguments
      .map((a) => this.AttributeArgument(a))
      .join(', ')})`
  }
  private AttributeArgument(n: ast.AttributeArgument): string {
    switch (n.type) {
      case 'keyed_argument':
        return this.KeyedArgument(n)
      case 'unkeyed_argument':
        return this.UnkeyedArgument(n)
      default:
        throw new Error(`unhandled attribute argument ${n!.type}`)
    }
  }
  private KeyedArgument(n: ast.KeyedArgument): string {
    return `${this.Identifier(n.name)}: ${this.Value(n.value)}`
  }
  private UnkeyedArgument(n: ast.UnkeyedArgument): string {
    return `${this.Value(n.value)}`
  }
  private Value(n: ast.Value): string {
    switch (n.type) {
      case 'boolean_value':
        return this.BooleanValue(n)
      case 'datetime_value':
        return this.DateTimeValue(n)
      case 'float_value':
        return this.FloatValue(n)
      case 'function_value':
        return this.FunctionValue(n)
      case 'int_value':
        return this.IntValue(n)
      case 'list_value':
        return this.ListValue(n)
      case 'map_value':
        return this.MapValue(n)
      case 'string_value':
        return this.StringValue(n)
      case 'reference_value':
        return this.ReferenceValue(n)
      default:
        throw new Error(`unhandled value ${n!.type}`)
    }
  }
  private BooleanValue(n: ast.BooleanValue): string {
    return String(n.value)
  }
  private DateTimeValue(n: ast.DateTimeValue): string {
    return n.value.toISOString()
  }
  private FloatValue(n: ast.FloatValue): string {
    return String(n.value)
  }
  private FunctionValue(n: ast.FunctionValue): string {
    return `${this.Identifier(n.name)}(${(n.arguments || [])
      .map((v) => this.Value(v))
      .join(', ')})`
  }
  private IntValue(n: ast.IntValue): string {
    return String(n.value)
  }
  private ListValue(n: ast.ListValue): string {
    let arr: string = '['
    arr += n.values.map((v) => this.Value(v)).join(', ')
    arr += ']'
    return arr
  }
  private MapValue(n: ast.MapValue): string {
    let obj: string = '{'
    for (let k in n.map) {
      obj += `${k}: ${this.Value(n.map[k])},`
    }
    obj += '}'
    return obj
  }
  private StringValue(n: ast.StringValue): string {
    return '"' + n.value + '"'
  }
  private ReferenceValue(n: ast.ReferenceValue): string {
    return this.Identifier(n.name)
  }
  private Identifier(n: ast.Identifier): string {
    return n.name
  }
}

export class Argument {
  constructor(private readonly n: ast.AttributeArgument) {}
  get value(): Value {
    return new Value(this.n.value)
  }
}

export class Value {
  constructor(private readonly n: ast.Value) {}
  get type(): ast.Value['type'] {
    return this.n.type
  }
}
