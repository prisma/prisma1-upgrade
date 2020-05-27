import * as ast from 'prismafile/dist/ast'
import { parse, print } from 'prismafile'

export class Schema {
  private readonly schema: ast.Schema

  constructor(p2: string) {
    this.schema = parse(p2)
  }

  get datasources(): Datasource[] {
    let dss: ast.DataSource[] = []
    for (let block of this.schema.blocks) {
      if (block.type === 'datasource') {
        dss.push(block)
      }
    }
    return dss.map((ds) => new Datasource(ds))
  }

  get models(): Model[] {
    let dss: ast.Model[] = []
    for (let block of this.schema.blocks) {
      if (block.type === 'model') {
        dss.push(block)
      }
    }
    return dss.map((ds) => new Model(ds))
  }

  toString(): string {
    return print(this.schema)
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
    switch (url.value.type) {
      case 'string_value':
        return url.value.value
      default:
        throw new Error(
          `datasource ${
            this.node.name
          } "url" attribute must be a string, but got ${url.value.type}`
        )
    }
  }
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
}

export class Field {
  constructor(private readonly n: ast.Field) {}
  get name(): string {
    return this.n.name.name
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
      if (attr.name !== a.name) {
        continue
      }
      this.n.attributes[i] = a
      return
    }
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

export class Attribute {
  constructor(private readonly n: ast.Attribute) {}
  get name(): string {
    return this.n.name.name
  }

  toString(): string {
    return this.FieldAttribute(this.n)
  }

  // TODO: move all this into the printer
  FieldAttribute(n: ast.Attribute): string {
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
  AttributeArgument(n: ast.AttributeArgument): string {
    switch (n.type) {
      case 'keyed_argument':
        return this.KeyedArgument(n)
      case 'unkeyed_argument':
        return this.UnkeyedArgument(n)
      default:
        throw new Error(`unhandled attribute argument ${n!.type}`)
    }
  }
  DataType(n: ast.DataType): string {
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
  ReferenceType(n: ast.ReferenceType): string {
    return this.Identifier(n.name)
  }
  StringType(n: ast.StringType): string {
    return n.name
  }
  BooleanType(n: ast.BooleanType): string {
    return n.name
  }
  DateTimeType(n: ast.DateTimeType): string {
    return n.name
  }
  IntType(n: ast.IntType): string {
    return n.name
  }
  FloatType(n: ast.FloatType): string {
    return n.name
  }
  JsonType(n: ast.JsonType): string {
    return n.name
  }
  KeyedArgument(n: ast.KeyedArgument): string {
    return `${this.Identifier(n.name)}: ${this.Value(n.value)}`
  }
  UnkeyedArgument(n: ast.UnkeyedArgument): string {
    return `${this.Value(n.value)}`
  }
  Value(n: ast.Value): string {
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
  BooleanValue(n: ast.BooleanValue): string {
    return String(n.value)
  }
  DateTimeValue(n: ast.DateTimeValue): string {
    return n.value.toISOString()
  }
  FloatValue(n: ast.FloatValue): string {
    return String(n.value)
  }
  FunctionValue(n: ast.FunctionValue): string {
    return `${this.Identifier(n.name)}(${(n.arguments || [])
      .map((v) => this.Value(v))
      .join(', ')})`
  }

  IntValue(n: ast.IntValue): string {
    return String(n.value)
  }
  ListValue(n: ast.ListValue): string {
    let arr: string = '['
    arr += n.values.map((v) => this.Value(v)).join(', ')
    arr += ']'
    return arr
  }
  MapValue(n: ast.MapValue): string {
    let obj: string = '{'
    for (let k in n.map) {
      obj += `${k}: ${this.Value(n.map[k])},`
    }
    obj += '}'
    return obj
  }
  StringValue(n: ast.StringValue): string {
    return '"' + n.value + '"'
  }
  ReferenceValue(n: ast.ReferenceValue): string {
    return this.Identifier(n.name)
  }
  Identifier(n: ast.Identifier): string {
    return n.name
  }
}
