export type Schema = {
  type: 'schema'
  blocks: Block[]
}

export type Block = DataSource | Generator | Model | Enum | TypeAlias

export type DataSource = {
  type: 'datasource'
  name: string
  assignments: Assignment[]
}

export type Generator = {
  type: 'generator'
  name: string
  assignments: Assignment[]
}

export type Model = {
  type: 'model'
  name: string
  properties: Property[]
}

export type Property = Field | Attribute

export type Assignment = {
  type: 'assignment'
  key: string
  value: Value
}

export type Enum = {
  type: 'enum'
  name: string
  enumerators: Enumerator[]
  attributes: Attribute[]
}

export type Enumerator = {
  type: 'enumerator'
  name: string
  value?: Value
}

export type TypeAlias = {
  type: 'type_alias'
  name: string
  datatype: DataType
  attributes: Attribute[]
}

export type Field = {
  type: 'field'
  name: string
  datatype: DataType
  attributes: Attribute[]
}

export type DataType = OptionalType | ListType | NamedType | ReferenceType

export type OptionalType = {
  type: 'optional_type'
  inner: ListType | NamedType | ReferenceType
}

export type ListType = {
  type: 'list_type'
  inner: DataType
}

export type NamedType = {
  type: 'named_type'
  name: 'String' | 'Boolean' | 'DateTime' | 'Int' | 'Float'
}

export type ReferenceType = {
  type: 'reference_type'
  name: string
}

export type Attribute = {
  type: 'attribute'
  group?: string
  name: string
  arguments: AttributeArgument[]
}

export type AttributeArgument = KeyedArgument | UnkeyedArgument

export type KeyedArgument = {
  type: 'keyed_argument'
  name: string
  value: Value
}

export type UnkeyedArgument = {
  type: 'unkeyed_argument'
  value: Value
}

export type Value =
  | ListValue
  | MapValue
  | StringValue
  | IntValue
  | BooleanValue
  | DateTimeValue
  | FloatValue
  | FunctionValue

export type ListValue = {
  type: 'list_value'
  values: Value[]
}

export type MapValue = {
  type: 'map_value'
  map: { [key: string]: Value }
}

export type StringValue = {
  type: 'string_value'
  value: string
}

export type IntValue = {
  type: 'int_value'
  value: number
}

export type BooleanValue = {
  type: 'boolean_value'
  value: boolean
}

export type DateTimeValue = {
  type: 'datetime_value'
  value: Date
}

export type FloatValue = {
  type: 'float_value'
  value: number
}

export type FunctionValue = {
  type: 'function_value'
  name: string
  arguments: Value[]
}
