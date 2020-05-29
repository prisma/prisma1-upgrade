import * as p1 from '../prisma1'

export function translate(provider: string, ops: Op[]): string[] {
  const printer = getTranslator(provider)
  const out: string[] = []
  for (let op of ops) {
    out.push(printer.translate(op))
  }
  return out
}

function getTranslator(provider: string): Translator {
  switch (provider) {
    case 'mysql':
      return new MySQL5()
    case 'postgres':
    case 'postgresql':
      return new Postgres()
    default:
      throw new Error(`unsupported provider "${provider}"`)
  }
}

export type Op =
  | SetDefaultOp
  | SetCreatedAtOp
  | AddUniqueConstraintOp
  | SetJsonTypeOp

export type SetDefaultOp = {
  type: 'SetDefaultOp'
  schema?: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
  p1Attr: p1.Directive
}

export type SetCreatedAtOp = {
  type: 'SetCreatedAtOp'
  schema?: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
  p1Attr: p1.Directive
}

export type AddUniqueConstraintOp = {
  type: 'AddUniqueConstraintOp'
  schema?: string
  table: string
  column: string
}

export type SetJsonTypeOp = {
  type: 'SetJsonTypeOp'
  schema?: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
}

export interface Translator {
  translate(op: Op): string
}

export class Postgres implements Translator {
  translate(op: Op): string {
    switch (op.type) {
      case 'SetCreatedAtOp':
        return this.SetCreatedAtOp(op)
      case 'SetDefaultOp':
        return this.SetDefaultOp(op)
      case 'SetJsonTypeOp':
        return this.SetJsonTypeOp(op)
      case 'AddUniqueConstraintOp':
        return this.AddUniqueConstraintOp(op)
      default:
        throw new Error('Postgres: unhandled op: ' + op!.type)
    }
  }

  private schema(schema: string | undefined, table: string): string {
    return schema ? `"${schema}"."${table}"` : `"${table}"`
  }

  private SetCreatedAtOp(op: SetCreatedAtOp): string {
    const tableName = this.schema(op.schema, op.p1Model.name)
    const fieldName = op.p1Field.name
    return `alter table ${tableName} alter column "${fieldName}" set default current_timestamp;`
  }

  private SetDefaultOp(op: SetDefaultOp): string {
    const arg = op.p1Attr.arguments.find((arg) => arg.name === 'value')
    if (!arg) return ''
    const tableName = this.schema(op.schema, op.p1Model.name)
    const fieldName = op.p1Field.name
    const defaultValue = this.defaultValue(arg.value)
    return `alter table ${tableName} alter column "${fieldName}" set default ${defaultValue};`
  }

  private defaultValue(value: p1.Value): string {
    switch (value.kind) {
      case 'BooleanValue':
        return value.value ? 'true' : 'false'
      case 'EnumValue':
        return "'" + String(value.value) + "'"
      case 'IntValue':
        return String(value.value)
      case 'FloatValue':
        return String(value.value)
      case 'StringValue':
        return "'" + String(value.value) + "'"
      default:
        throw new Error('MySQL5: unhandled dataType: ' + value!.kind)
    }
  }

  private SetJsonTypeOp(op: SetJsonTypeOp): string {
    const tableName = this.schema(op.schema, op.p1Model.name)
    const fieldName = op.p1Field.name
    return `alter table ${tableName} alter column "${fieldName}" set data type jsonb using "${fieldName}"::text::jsonb;`
  }

  private AddUniqueConstraintOp(op: AddUniqueConstraintOp): string {
    const tableName = this.schema(op.schema, op.table)
    const fieldName = op.column
    return `alter table ${tableName} add unique ("${fieldName}");`
  }
}

export class MySQL5 implements Translator {
  translate(op: Op): string {
    switch (op.type) {
      case 'SetDefaultOp':
        return this.SetDefaultOp(op)
      case 'SetCreatedAtOp':
        return this.SetCreatedAtOp(op)
      case 'AddUniqueConstraintOp':
        return this.AddUniqueConstraintOp(op)
      case 'SetJsonTypeOp':
        return this.SetJsonTypeOp(op)
      default:
        throw new Error('MySQL5: unhandled op: ' + op!.type)
    }
  }

  private backtick(ident: string): string {
    return '`' + ident + '`'
  }

  private SetDefaultOp(op: SetDefaultOp): string {
    const arg = op.p1Attr.arguments.find((arg) => arg.name === 'value')
    if (!arg) return ''
    const modelName = this.backtick(op.p1Model.name)
    const fieldName = this.backtick(op.p1Field.name)
    const dataType = this.dataType(arg.value)
    const nullable = !!~op.p1Field.type.toString().indexOf('?')
    const notNull = nullable ? '' : 'not null'
    const defaultValue = this.defaultValue(arg.value)
    return `alter table ${modelName} change ${fieldName} ${fieldName} ${dataType} ${notNull} default ${defaultValue};`
  }

  private dataType(value: p1.Value): string {
    switch (value.kind) {
      case 'BooleanValue':
        return `tinyint(1)`
      case 'EnumValue':
        return `varchar(191)`
      case 'IntValue':
        return `int(11)`
      case 'FloatValue':
        return `decimal(65,30)`
      case 'StringValue':
        return `mediumtext`
      default:
        throw new Error('MySQL5: unhandled dataType: ' + value!.kind)
    }
  }

  private defaultValue(value: p1.Value): string {
    switch (value.kind) {
      case 'BooleanValue':
        return value.value ? '1' : '0'
      case 'EnumValue':
        return "'" + String(value.value) + "'"
      case 'IntValue':
        return String(value.value)
      case 'FloatValue':
        return String(value.value)
      case 'StringValue':
        return "'" + String(value.value) + "'"
      default:
        throw new Error('MySQL5: unhandled dataType: ' + value!.kind)
    }
  }

  private SetCreatedAtOp(op: SetCreatedAtOp): string {
    const modelName = this.backtick(op.p1Model.name)
    const fieldName = this.backtick(op.p1Field.name)
    const dataType = 'datetime'
    const nullable = !!~op.p1Field.type.toString().indexOf('?')
    const notNull = nullable ? '' : 'not null'
    return `alter table ${modelName} change ${fieldName} ${fieldName} ${dataType} ${notNull} default current_timestamp;`
  }

  private AddUniqueConstraintOp(op: AddUniqueConstraintOp): string {
    const modelName = this.backtick(op.table)
    const fieldName = this.backtick(op.column)
    return `alter table ${modelName} add unique (${fieldName});`
  }

  private SetJsonTypeOp(op: SetJsonTypeOp): string {
    const modelName = this.backtick(op.p1Model.name)
    const fieldName = this.backtick(op.p1Field.name)
    return `alter table ${modelName} change ${fieldName} ${fieldName} json;`
  }
}
