import * as ast from './ast'

export default class Printer {
  print(schema: ast.Schema): string {
    return Schema(schema)
  }
}

function Schema(schema: ast.Schema): string {
  let blocks: string[] = []
  for (let b of schema.blocks) {
    blocks.push(Block(b))
  }
  return blocks.join('\n\n')
}

function Block(block: ast.Block): string {
  switch (block.type) {
    case 'model':
      return Model(block)
    case 'datasource':
      return DataSource(block)
    case 'enum':
      return Enum(block)
    case 'generator':
      return Generator(block)
    default:
      throw new Error(`unhandled type ${block!.type}`)
  }
}

function Model(n: ast.Model): string {
  return `model ${n.name} {
  ${n.properties.map(Property).join('\n  ')}
}`
}

function DataSource(n: ast.DataSource): string {
  return `datasource ${n.name} {
  ${n.assignments.map(Assignment).join('\n  ')}
}`
}

function Enum(n: ast.Enum): string {
  return `enum ${n.name} {
  ${n.enumerators.map(Enumerator).join('\n  ')}
}`
}

function Generator(n: ast.Generator): string {
  return `generator ${n.name} {
  ${n.assignments.map(Assignment).join('\n  ')}
}`
}

function Property(n: ast.Property): string {
  switch (n.type) {
    case 'field':
      return Field(n)
    case 'attribute':
      return ModelAttribute(n)
    default:
      throw new Error(`unhandled type ${n!.type}`)
  }
}

function Assignment(n: ast.Assignment): string {
  return `${n.key} = ${Value(n.value)}`
}

function Enumerator(n: ast.Enumerator): string {
  return `${n.name}`
}

function Field(n: ast.Field): string {
  const attrs = n.attributes.map(FieldAttribute)
  return `${n.name} ${DataType(n.datatype)} ${attrs.join(' ')}`
}

function FieldAttribute(n: ast.Attribute): string {
  const name = n.group ? `${n.group}.${n.name}` : n.name
  if (!n.arguments.length) {
    return `@${name}`
  }
  return `@${name}(${n.arguments.map(AttributeArgument).join(', ')})`
}

function ModelAttribute(n: ast.Attribute): string {
  const name = n.group ? `${n.group}.${n.name}` : n.name
  if (!n.arguments.length) {
    return `@@${name}`
  }
  return `@@${name}(${n.arguments.map(AttributeArgument).join(', ')})`
}

function AttributeArgument(n: ast.AttributeArgument): string {
  switch (n.type) {
    case 'keyed_argument':
      return KeyedArgument(n)
    case 'unkeyed_argument':
      return UnkeyedArgument(n)
    default:
      throw new Error(`unhandled type ${n!.type}`)
  }
}

function DataType(n: ast.DataType): string {
  switch (n.type) {
    case 'list_type':
      return `${DataType(n.inner)}[]`
    case 'optional_type':
      return `${DataType(n.inner)}?`
    case 'named_type':
    case 'reference_type':
      return `${n.name}`
  }
}

function KeyedArgument(n: ast.KeyedArgument): string {
  return `${n.name}: ${Value(n.value)}`
}

function UnkeyedArgument(n: ast.UnkeyedArgument): string {
  return `${Value(n.value)}`
}

function Value(n: ast.Value): string {
  switch (n.type) {
    case 'boolean_value':
      return BooleanValue(n)
    case 'datetime_value':
      return DateTimeValue(n)
    case 'float_value':
      return FloatValue(n)
    case 'function_value':
      return FunctionValue(n)
    case 'int_value':
      return IntValue(n)
    case 'list_value':
      return ListValue(n)
    case 'map_value':
      return MapValue(n)
    case 'string_value':
      return StringValue(n)
    default:
      throw new Error(`unhandled type ${n!.type}`)
  }
}

function BooleanValue(n: ast.BooleanValue): string {
  return String(n.value)
}

function DateTimeValue(n: ast.DateTimeValue): string {
  return n.value.toISOString()
}

function FloatValue(n: ast.FloatValue): string {
  return String(n.value)
}

function FunctionValue(n: ast.FunctionValue): string {
  return `${n.name}(${n.arguments.map(Value).join(', ')})`
}

function IntValue(n: ast.IntValue): string {
  return String(n.value)
}

function ListValue(n: ast.ListValue): string {
  return JSON.stringify(n.values.map(Value))
}

function MapValue(n: ast.MapValue): string {
  const obj: { [key: string]: string } = {}
  for (let k in n.map) {
    obj[k] = Value(n.map[k])
  }
  return JSON.stringify(obj)
}

function StringValue(n: ast.StringValue): string {
  return n.value
}
