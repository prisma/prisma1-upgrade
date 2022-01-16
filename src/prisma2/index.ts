import * as ast from "prismafile/dist/ast"
import { parse, print } from "prismafile"

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
      if (block.type === "datasource") {
        dss.push(block)
      }
    }
    return dss.map((ds) => new Datasource(ds))
  }

  get models(): Model[] {
    let dss: ast.Model[] = []
    for (let block of this.n.blocks) {
      if (block.type === "model") {
        dss.push(block)
      }
    }
    return dss.map((ds) => new Model(this, ds))
  }

  get enums(): Enum[] {
    let dss: ast.Enum[] = []
    for (let block of this.n.blocks) {
      if (block.type === "enum") {
        dss.push(block)
      }
    }
    return dss.map((ds) => new Enum(ds))
  }

  // return the provider
  provider(): string {
    const datasource = this.datasources[0]
    if (!datasource) {
      throw new Error("The Prisma 2+ schema must contain a datasource configuration")
    }
    // find the prisma2 datasource provider
    const provider = datasource.provider
    if (!provider) {
      throw new Error("The Prisma 2+ datasource must contain a provider")
    }
    return provider
  }

  // needed for adjusting the test database
  setURL(url: string) {
    const datasource = this.datasources[0]
    if (!datasource) {
      throw new Error("The Prisma 2+ schema must contain a datasource configuration")
    }
    datasource.url = url
  }

  // return the first url
  url(): string | void {
    const datasource = this.datasources[0]
    if (!datasource) {
      return
    }
    const url = datasource.url
    if (!url) {
      return
    }
    return url
  }

  // primarily useful for postgres
  // schema(): string {
  //   const u = this.url()
  //   const o = url.parse(u, true)
  //   return String(o.query['schema'] || '')
  // }

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

  findFields(fn: (m: Model, f: Field) => boolean): Field[] {
    const fields: Field[] = []
    for (let model of this.models) {
      for (let field of model.fields) {
        if (fn(model, field)) {
          fields.push(field)
        }
      }
    }
    return fields
  }

  findAttribute(fn: (m: Model, f: Field, a: Attribute) => boolean): Attribute | void {
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

  toTestString(): string {
    const clone: ast.Schema = JSON.parse(JSON.stringify(this.n))
    clone.blocks = clone.blocks.filter((block) => block.type !== "datasource")
    return print(clone)
  }

  removeModel(block: ast.Block) {
    const i = this.n.blocks.indexOf(block)
    if (~i) this.n.blocks.splice(i, 1)
  }
}

export class Datasource {
  constructor(private readonly node: ast.DataSource) {}

  get provider(): string | undefined {
    const provider = this.node.assignments.find((assignment) => assignment.key.name === "provider")
    if (!provider) return
    switch (provider.value.type) {
      case "string_value":
        return provider.value.value
      default:
        throw new Error(
          `datasource ${this.node.name} "provider" attribute must be a string, but got ${provider.value.type}`
        )
    }
  }

  get url(): string | undefined {
    const url = this.node.assignments.find((a) => a.key.name === "url")
    if (!url) return
    const value = url.value
    switch (value.type) {
      case "string_value":
        return value.value
      default:
        return
    }
  }

  set url(url: string | undefined) {
    if (!url) return
    const a = this.node.assignments.find((a) => a.key.name === "url")
    if (!a) {
      this.node.assignments.push({
        type: "assignment",
        start: pos,
        end: pos,
        key: {
          type: "identifier",
          name: "url",
          start: pos,
          end: pos,
        },
        value: {
          type: "string_value",
          value: url,
          start: pos,
          end: pos,
        },
      })
      return
    }
    a.value = {
      type: "string_value",
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
  constructor(private readonly s: Schema, private readonly n: ast.Model) {}
  get name(): string {
    return this.n.name.name
  }

  get dbname(): string {
    const map = this.attributes.find((a) => a.name === "map")
    if (!map) {
      return this.n.name.name
    }
    const arg = map.arguments[0]
    if (!arg || arg.value.type !== "string_value") {
      return this.n.name.name
    }
    return arg.value.value
  }

  get fields(): Field[] {
    let fields: ast.Field[] = []
    for (let prop of this.n.properties) {
      if (prop.type === "field") {
        fields.push(prop)
      }
    }
    return fields.map((n) => new Field(n))
  }

  get attributes(): Attribute[] {
    let attrs: ast.Attribute[] = []
    for (let prop of this.n.properties) {
      if (prop.type === "attribute") {
        attrs.push(prop)
      }
    }
    return attrs.map((n) => new Attribute(n))
  }

  findField(fn: (f: Field) => boolean): Field | void {
    for (let field of this.fields) {
      if (fn(field)) {
        return field
      }
    }
  }

  remove() {
    this.s.removeModel(this.n)
  }

  rename(name: string) {
    const dbName = this.name
    this.n.name.name = name
    this.upsertAttribute({
      type: "attribute",
      name: {
        type: "identifier",
        name: "map",
        start: pos,
        end: pos,
      },
      start: pos,
      end: pos,
      arguments: [
        {
          type: "unkeyed_argument",
          value: {
            type: "string_value",
            value: dbName,
            start: pos,
            end: pos,
          },
          start: pos,
          end: pos,
        },
      ],
    })
    // adjust all references
    const fields = this.s.findFields((_, f) => f.type.innermost().toString() === dbName)
    for (let field of fields) {
      field.setName(name)
      field.setInnermostType({
        type: "named_type",
        name: {
          type: "identifier",
          name: name,
          start: pos,
          end: pos,
        },
        start: pos,
        end: pos,
      })
    }
  }

  upsertAttribute(a: ast.Attribute) {
    for (let i = 0; i < this.n.properties.length; i++) {
      const prop = this.n.properties[i]
      if (prop.type === "field") {
        continue
      }
      if (prop.name.name !== a.name.name) {
        continue
      }
      this.n.properties[i] = a
      return
    }
    this.n.properties.push(a)
    return
  }
}

export class Enum {
  constructor(private readonly n: ast.Enum) {}
  get name(): string {
    return this.n.name.name
  }
}

export class Field {
  constructor(private readonly n: ast.Field) {}
  get name(): string {
    return this.n.name.name
  }

  setName(name: string): void {
    this.n.name.name = name
  }

  setType(datatype: ast.DataType): void {
    this.n.datatype = datatype
  }

  get dbname(): string {
    const map = this.attributes.find((a) => a.name === "map")
    if (!map) {
      return this.n.name.name
    }
    const arg = map.arguments[0]
    if (!arg || arg.value.type !== "string_value") {
      return this.n.name.name
    }
    return arg.value.value
  }

  rename(name: string): void {
    const dbName = this.name
    this.setName(name)
    this.upsertAttribute({
      type: "attribute",
      name: {
        type: "identifier",
        name: "map",
        start: pos,
        end: pos,
      },
      start: pos,
      end: pos,
      arguments: [
        {
          type: "unkeyed_argument",
          value: {
            type: "string_value",
            value: dbName,
            start: pos,
            end: pos,
          },
          start: pos,
          end: pos,
        },
      ],
    })
  }

  get type() {
    return new DataType(this.n.datatype)
  }

  // setNotNull(): void {
  //   this._setNotNull(this.n.datatype)
  // }

  // private _setNotNull(n: ast.DataType, parent?: ast.ListType) {
  //   switch (n.type) {
  //     case 'list_type':
  //       this._setNotNull(n.inner, n)
  //       return
  //     case 'optional_type':
  //       if (parent) {
  //         parent.inner = n.inner
  //         return
  //       }
  //       this.n.datatype = n.inner
  //       return
  //     default:
  //       return
  //   }
  // }

  setInnermostType(to: ast.DataType): void {
    this.type.setInnermostType(to)
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
  constructor(private n: ast.DataType) {}

  optional(): boolean {
    return this.n.type === "optional_type"
  }

  list(): boolean {
    return this.n.type === "list_type"
  }

  innermost(): DataType {
    switch (this.n.type) {
      case "optional_type":
      case "list_type":
        return new DataType(this.n.inner)
      default:
        return this
    }
  }

  isReference(): boolean {
    const innermost = this.innermost()
    const n = innermost.n
    if (n.type !== "named_type") {
      return false
    }
    switch (n.name.name) {
      case "String":
      case "Float":
      case "Int":
      case "DateTime":
      case "Json":
        return false
      default:
        return true
    }
  }

  setInnermostType(to: ast.DataType) {
    this.setInnermost(this.n, to)
  }

  private setInnermost(from: ast.DataType, to: ast.DataType, parent?: ast.OptionalType | ast.ListType): void {
    switch (from.type) {
      case "optional_type":
      case "list_type":
        return this.setInnermost(from.inner, to, from)
      default:
        if (parent) {
          parent.inner = to
          return
        }
        this.n = to
    }
  }

  toString(): string {
    return this.DataType(this.n)
  }

  // datatype printer
  private DataType(n: ast.DataType): string {
    switch (n.type) {
      case "list_type":
        return `${this.DataType(n.inner)}[]`
      case "optional_type":
        return `${this.DataType(n.inner)}?`
      case "named_type":
        return `${this.Identifier(n.name)}`
      default:
        throw new Error(`Unhandled Datatype: ${n!.type}`)
    }
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
    const name = n.group ? `${n.group}.${this.Identifier(n.name)}` : this.Identifier(n.name)
    if (!n.arguments.length) {
      return `@${name}`
    }
    return `@${name}(${n.arguments.map((a) => this.AttributeArgument(a)).join(", ")})`
  }
  private AttributeArgument(n: ast.AttributeArgument): string {
    switch (n.type) {
      case "keyed_argument":
        return this.KeyedArgument(n)
      case "unkeyed_argument":
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
      case "boolean_value":
        return this.BooleanValue(n)
      case "datetime_value":
        return this.DateTimeValue(n)
      case "float_value":
        return this.FloatValue(n)
      case "function_value":
        return this.FunctionValue(n)
      case "int_value":
        return this.IntValue(n)
      case "list_value":
        return this.ListValue(n)
      case "map_value":
        return this.MapValue(n)
      case "string_value":
        return this.StringValue(n)
      case "reference_value":
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
    return `${this.Identifier(n.name)}(${(n.arguments || []).map((v) => this.Value(v)).join(", ")})`
  }
  private IntValue(n: ast.IntValue): string {
    return String(n.value)
  }
  private ListValue(n: ast.ListValue): string {
    let arr: string = "["
    arr += n.values.map((v) => this.Value(v)).join(", ")
    arr += "]"
    return arr
  }
  private MapValue(n: ast.MapValue): string {
    let obj: string = "{"
    for (let field of n.fields) {
      obj += `${field.key}: ${this.Value(field.value)},`
    }
    obj += "}"
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

  get key(): string | undefined {
    switch (this.n.type) {
      case "keyed_argument":
        return this.n.name.name
      default:
        return undefined
    }
  }

  get value(): ast.Value {
    return this.n.value
  }
}

export class Value {
  constructor(private readonly n: ast.Value) {}
  get type(): ast.Value["type"] {
    return this.n.type
  }
}
