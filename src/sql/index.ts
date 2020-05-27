import * as p1 from '../prisma1'

export type Op =
  | SetDefaultOp
  | SetCreatedAtOp
  | AddUniqueConstraintOp
  | SetJsonTypeOp

export type SetDefaultOp = {
  type: 'SetDefaultOp'
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
  p1Attr: p1.Directive
}

export type SetCreatedAtOp = {
  type: 'SetCreatedAtOp'
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
  p1Attr: p1.Directive
}

export type AddUniqueConstraintOp = {
  type: 'AddUniqueConstraintOp'
  table: string
  column: string
}

export type SetJsonTypeOp = {
  type: 'SetJsonTypeOp'
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
}

export interface Printer {
  print(op: Op): string
}

export class Postgres implements Printer {
  print(op: Op): string {
    switch (op.type) {
      default:
        throw new Error('Postgres: unhandled op: ' + op!.type)
    }
  }
}

export class MySQL5 implements Printer {
  print(op: Op): string {
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

  private SetDefaultOp(op: SetDefaultOp): string {
    const arg = op.p1Attr.arguments.find((arg) => arg.name === 'value')
    if (!arg) return ''
    const modelName = op.p1Model.name
    const fieldName = op.p1Field.name
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
    const modelName = op.p1Model.name
    const fieldName = op.p1Field.name
    const dataType = 'datetime'
    const nullable = !!~op.p1Field.type.toString().indexOf('?')
    const notNull = nullable ? '' : 'not null'
    return `alter table ${modelName} change ${fieldName} ${fieldName} ${dataType} ${notNull} default current_timestamp;`
  }

  private AddUniqueConstraintOp(op: AddUniqueConstraintOp): string {
    return `alter table ${op.table} add unique (${op.column});`
  }

  private SetJsonTypeOp(op: SetJsonTypeOp): string {
    const modelName = op.p1Model.name
    const fieldName = op.p1Field.name
    return `alter table ${modelName} change ${fieldName} ${fieldName} json;`
  }
}
