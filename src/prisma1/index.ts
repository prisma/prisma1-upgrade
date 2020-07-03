import {
  DocumentNode,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  SchemaDefinitionNode,
  DirectiveDefinitionNode,
  SchemaExtensionNode,
  ScalarTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  UnionTypeDefinitionNode,
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  ScalarTypeExtensionNode,
  ObjectTypeExtensionNode,
  InterfaceTypeExtensionNode,
  UnionTypeExtensionNode,
  EnumTypeExtensionNode,
  EnumValueDefinitionNode,
  InputObjectTypeExtensionNode,
  DefinitionNode,
  FieldDefinitionNode,
  NamedTypeNode,
  ListTypeNode,
  NonNullTypeNode,
  DirectiveNode,
  ArgumentNode,
  VariableNode,
  IntValueNode,
  FloatValueNode,
  StringValueNode,
  BooleanValueNode,
  NullValueNode,
  EnumValueNode,
  ListValueNode,
  ObjectValueNode,
} from 'graphql/language/ast'

import * as gql from 'graphql/language/parser'

export function parse(p1: string): Schema {
  const doc = gql.parse(p1)
  return new Schema(doc)
}

export class Schema {
  constructor(private readonly doc: DocumentNode) {}

  get definitions(): Definition[] {
    return this.doc.definitions.map((def) => {
      switch (def.kind) {
        case 'SchemaDefinition':
          return new SchemaDefinition(def)
        case 'ScalarTypeDefinition':
          return new ScalarTypeDefinition(def)
        case 'ObjectTypeDefinition':
          return new ObjectTypeDefinition(def)
        case 'InterfaceTypeDefinition':
          return new InterfaceTypeDefinition(def)
        case 'UnionTypeDefinition':
          return new UnionTypeDefinition(def)
        case 'EnumTypeDefinition':
          return new EnumTypeDefinition(def)
        case 'InputObjectTypeDefinition':
          return new InputObjectTypeDefinition(def)
        case 'DirectiveDefinition':
          return new DirectiveDefinition(def)
        case 'SchemaExtension':
          return new SchemaExtension(def)
        case 'ScalarTypeExtension':
          return new ScalarTypeExtension(def)
        case 'ObjectTypeExtension':
          return new ObjectTypeExtension(def)
        case 'InterfaceTypeExtension':
          return new InterfaceTypeExtension(def)
        case 'UnionTypeExtension':
          return new UnionTypeExtension(def)
        case 'EnumTypeExtension':
          return new EnumTypeExtension(def)
        case 'InputObjectTypeExtension':
          return new InputObjectTypeExtension(def)
        case 'OperationDefinition':
          return new OperationDefinition(def)
        case 'FragmentDefinition':
          return new FragmentDefinition(def)
      }
    })
  }

  get objects(): ObjectTypeDefinition[] {
    let arr: ObjectTypeDefinition[] = []
    for (let def of this.definitions) {
      if (def instanceof ObjectTypeDefinition) {
        arr.push(def)
      }
    }
    return arr
  }

  findObject(
    fn: (obj: ObjectTypeDefinition) => boolean
  ): ObjectTypeDefinition | void {
    for (let object of this.objects) {
      if (fn(object)) {
        return object
      }
    }
  }

  get enums(): EnumTypeDefinition[] {
    let arr: EnumTypeDefinition[] = []
    for (let def of this.definitions) {
      if (def instanceof EnumTypeDefinition) {
        arr.push(def)
      }
    }
    return arr
  }

  version(): '1.1' | '1.0' {
    for (let obj of this.objects) {
      for (let field of obj.fields) {
        if (field.type.named() !== 'ID') {
          continue
        }
        for (let directive of field.directives) {
          if (directive.name === 'id') {
            return '1.1'
          }
        }
        return '1.0'
      }
    }
    // arbitrary: default to 1.1
    return '1.1'
  }
}

interface Definition {
  kind: DefinitionNode['kind']
}

export class SchemaDefinition {
  constructor(private readonly def: SchemaDefinitionNode) {}
  get kind() {
    return this.def.kind
  }
}

export class ScalarTypeDefinition {
  constructor(private readonly def: ScalarTypeDefinitionNode) {}
  get kind() {
    return this.def.kind
  }
}
export class ObjectTypeDefinition {
  constructor(private readonly def: ObjectTypeDefinitionNode) {}
  get kind() {
    return this.def.kind
  }
  get name(): string {
    return this.def.name.value
  }

  get dbname(): string {
    if (!this.def.directives) {
      return this.name
    }
    const db = this.def.directives.find((d) => d.name.value === 'db')
    if (!db || !db.arguments) {
      return this.name
    }
    const arg = db.arguments.find((arg) => arg.name.value === 'name')
    if (!arg || !arg.value || arg.value.kind !== 'StringValue') {
      return this.name
    }
    return arg.value.value
  }

  get fields(): FieldDefinition[] {
    if (!this.def.fields) return []
    return this.def.fields.map((field) => new FieldDefinition(this, field))
  }
}
export class InterfaceTypeDefinition {
  constructor(private readonly def: InterfaceTypeDefinitionNode) {}
  get kind() {
    return this.def.kind
  }
}

export class UnionTypeDefinition {
  constructor(private readonly def: UnionTypeDefinitionNode) {}
  get kind() {
    return this.def.kind
  }
}

export class EnumTypeDefinition {
  constructor(private readonly def: EnumTypeDefinitionNode) {}
  get name() {
    return this.def.name.value
  }
  get dbname(): string {
    if (!this.def.directives) {
      return this.name
    }
    const db = this.def.directives.find((d) => d.name.value === 'db')
    if (!db || !db.arguments) {
      return this.name
    }
    const arg = db.arguments.find((arg) => arg.name.value === 'name')
    if (!arg || !arg.value || arg.value.kind !== 'StringValue') {
      return this.name
    }
    return arg.value.value
  }
  get kind() {
    return this.def.kind
  }
  get values(): EnumValueDefinition[] {
    let arr: EnumValueDefinition[] = []
    if (!this.def.values) {
      return arr
    }
    for (let value of this.def.values) {
      arr.push(new EnumValueDefinition(value))
    }
    return arr
  }
}

export class EnumValueDefinition {
  constructor(private readonly def: EnumValueDefinitionNode) {}
  get name() {
    return this.def.name.value
  }
}

export class InputObjectTypeDefinition {
  constructor(private readonly def: InputObjectTypeDefinitionNode) {}
  get kind() {
    return this.def.kind
  }
}

export class DirectiveDefinition {
  constructor(private readonly def: DirectiveDefinitionNode) {}
  get name(): string {
    return this.def.name.value
  }
  get kind() {
    return this.def.kind
  }
}

export class SchemaExtension {
  constructor(private readonly def: SchemaExtensionNode) {}
  get kind() {
    return this.def.kind
  }
}

export class ScalarTypeExtension {
  constructor(private readonly def: ScalarTypeExtensionNode) {}
  get kind() {
    return this.def.kind
  }
}
export class ObjectTypeExtension {
  constructor(private readonly def: ObjectTypeExtensionNode) {}
  get kind() {
    return this.def.kind
  }
}
export class InterfaceTypeExtension {
  constructor(private readonly def: InterfaceTypeExtensionNode) {}
  get kind() {
    return this.def.kind
  }
}
export class UnionTypeExtension {
  constructor(private readonly def: UnionTypeExtensionNode) {}
  get kind() {
    return this.def.kind
  }
}
export class EnumTypeExtension {
  constructor(private readonly def: EnumTypeExtensionNode) {}
  get kind() {
    return this.def.kind
  }
}
export class InputObjectTypeExtension {
  constructor(private readonly def: InputObjectTypeExtensionNode) {}
  get kind() {
    return this.def.kind
  }
}

export class OperationDefinition {
  constructor(private readonly def: OperationDefinitionNode) {}
  get kind() {
    return this.def.kind
  }
}

export class FragmentDefinition {
  constructor(private readonly def: FragmentDefinitionNode) {}
  get kind() {
    return this.def.kind
  }
}

export class FieldDefinition {
  constructor(
    private readonly modelDef: ObjectTypeDefinition,
    private readonly def: FieldDefinitionNode
  ) {}

  get parent() {
    return this.modelDef
  }

  get name() {
    return this.def.name.value
  }

  get dbname(): string {
    if (!this.def.directives) {
      return this.name
    }
    const db = this.def.directives.find((d) => d.name.value === 'db')
    if (!db || !db.arguments) {
      return this.name
    }
    const arg = db.arguments.find((arg) => arg.name.value === 'name')
    if (!arg || !arg.value || arg.value.kind !== 'StringValue') {
      return this.name
    }
    return arg.value.value
  }

  get type(): Type {
    switch (this.def.type.kind) {
      case 'ListType':
        return new ListType(this.def.type)
      case 'NamedType':
        return new NamedType(this.def.type)
      case 'NonNullType':
        return new NonNullType(this.def.type)
    }
  }

  get directives(): Directive[] {
    if (!this.def.directives) return []
    return this.def.directives.map((dir) => new Directive(dir))
  }

  optional(): boolean {
    return this.type.optional()
  }

  findDirective(fn: (n: Directive) => boolean): Directive | void {
    for (let d of this.directives) {
      if (fn(d)) {
        return d
      }
    }
  }
}

export type Type = NamedType | ListType | NonNullType

// export interface Type {
//   named(): string
//   kind: TypeNode['kind']
//   toString(): string
//   isReference(): boolean
// }

function isReference(name: string): boolean {
  switch (name) {
    case 'ID':
    case 'UUID':
    case 'String':
    case 'Int':
    case 'Float':
    case 'Boolean':
    case 'DateTime':
    case 'Json':
      return false
    default:
      return true
  }
}

export class NamedType {
  constructor(private readonly def: NamedTypeNode) {}

  get name(): string {
    return this.def.name.value
  }

  get kind(): 'NamedType' {
    return this.def.kind
  }

  optional(): boolean {
    return true
  }

  named() {
    return this.name
  }

  toString(): string {
    return this.def.name.value
  }

  isReference(): boolean {
    return isReference(this.named())
  }
}

export class ListType {
  constructor(private readonly def: ListTypeNode) {}

  get kind(): 'ListType' {
    return this.def.kind
  }

  inner() {
    switch (this.def.type.kind) {
      case 'ListType':
        return new ListType(this.def.type)
      case 'NamedType':
        return new NamedType(this.def.type)
      case 'NonNullType':
        return new NonNullType(this.def.type)
    }
  }

  optional(): boolean {
    return true
  }

  named(): string {
    return this.inner().named()
  }

  toString(): string {
    return '[' + this.inner().toString() + ']'
  }

  isReference(): boolean {
    return isReference(this.named())
  }
}

export class NonNullType {
  constructor(private readonly def: NonNullTypeNode) {}

  get kind(): 'NonNullType' {
    return this.def.kind
  }

  inner() {
    switch (this.def.type.kind) {
      case 'ListType':
        return new ListType(this.def.type)
      case 'NamedType':
        return new NamedType(this.def.type)
    }
  }

  optional(): boolean {
    return false
  }

  named(): string {
    return this.inner().named()
  }

  toString(): string {
    return this.inner().toString() + '!'
  }

  isReference(): boolean {
    return isReference(this.named())
  }
}

export class Directive {
  constructor(private readonly def: DirectiveNode) {}
  get name() {
    return this.def.name.value
  }
  get arguments() {
    if (!this.def.arguments) return []
    return this.def.arguments.map((arg) => new Argument(arg))
  }

  findArgument(fn: (arg: Argument) => boolean): Argument | void {
    for (let arg of this.arguments) {
      if (fn(arg)) {
        return arg
      }
    }
  }
}

export class Argument {
  constructor(private readonly def: ArgumentNode) {}
  get name() {
    return this.def.name.value
  }
  get value(): Value {
    switch (this.def.value.kind) {
      case 'Variable':
        return new Variable(this.def.value)
      case 'IntValue':
        return new IntValue(this.def.value)
      case 'FloatValue':
        return new FloatValue(this.def.value)
      case 'StringValue':
        return new StringValue(this.def.value)
      case 'BooleanValue':
        return new BooleanValue(this.def.value)
      case 'NullValue':
        return new NullValue(this.def.value)
      case 'EnumValue':
        return new EnumValue(this.def.value)
      case 'ListValue':
        return new ListValue(this.def.value)
      case 'ObjectValue':
        return new ObjectValue(this.def.value)
    }
  }
}

export type Value =
  | Variable
  | IntValue
  | FloatValue
  | StringValue
  | BooleanValue
  | NullValue
  | EnumValue
  | ListValue
  | ObjectValue

export class Variable {
  constructor(private readonly def: VariableNode) {}

  get kind(): 'Variable' {
    return this.def.kind
  }

  get name(): string {
    return this.def.name.value
  }
}

export class IntValue {
  constructor(private readonly def: IntValueNode) {}

  get kind(): 'IntValue' {
    return this.def.kind
  }

  get value(): number {
    return parseInt(this.def.value, 10)
  }
}

export class FloatValue {
  constructor(private readonly def: FloatValueNode) {}

  get kind(): 'FloatValue' {
    return this.def.kind
  }

  get value(): number {
    return parseFloat(this.def.value)
  }
}

export class StringValue {
  constructor(private readonly def: StringValueNode) {}

  get kind(): 'StringValue' {
    return this.def.kind
  }

  get value(): string {
    return this.def.value
  }
}

export class BooleanValue {
  constructor(private readonly def: BooleanValueNode) {}

  get kind(): 'BooleanValue' {
    return this.def.kind
  }

  get value(): boolean {
    return this.def.value
  }
}

export class NullValue {
  constructor(private readonly def: NullValueNode) {}

  get kind(): 'NullValue' {
    return this.def.kind
  }

  get value(): null {
    return null
  }
}

export class EnumValue {
  constructor(private readonly def: EnumValueNode) {}

  get kind(): 'EnumValue' {
    return this.def.kind
  }

  get value(): string {
    return this.def.value
  }
}

export class ListValue {
  constructor(private readonly def: ListValueNode) {}
  get kind(): 'ListValue' {
    return this.def.kind
  }

  get value(): Readonly<Value[]> {
    // TODO: finish
    // return this.def.values
    return []
  }
}

type ObjectMap = { [name: string]: Value }

export class ObjectValue {
  constructor(private readonly def: ObjectValueNode) {}
  get kind(): 'ObjectValue' {
    return this.def.kind
  }

  get value(): ObjectMap {
    const map: ObjectMap = {}
    // TODO: finish
    // for (let field of this.def.fields) {
    //   map[field.name.value] = field.value
    // }
    return map
  }
}
