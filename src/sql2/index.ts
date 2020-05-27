import * as p1 from '../prisma1'
import * as p2 from '../prisma2'

export type Op = SetDefaultOp | SetCreatedAtOp

export type SetDefaultOp = {
  type: 'SetDefaultOp'
  p1Model: p1.ObjectTypeDefinition
  p2Model: p2.Model
  p1Field: p1.FieldDefinition
  p2Field: p2.Field
  p1Attr: p1.Directive
}

export type SetCreatedAtOp = {
  type: 'SetCreatedAtOp'
  p1Model: p1.ObjectTypeDefinition
  p2Model: p2.Model
  p1Field: p1.FieldDefinition
  p2Field: p2.Field
  p1Attr: p1.Directive
}

export interface Printer {
  print(op: Op): string
}

export class Postgres implements Printer {
  print(op: Op): string {
    switch (op.type) {
      default:
        throw this.unhandled(op)
    }
  }

  unhandled(op: Op): Error {
    return new Error('Postgres: unhandled op: ' + op.type)
  }
}

export class MySQL5 implements Printer {
  print(op: Op): string {
    switch (op.type) {
      case 'SetDefaultOp':
        return this.SetDefaultOp(op)
      case 'SetCreatedAtOp':
        return this.SetCreatedAtOp(op)
      default:
        throw new Error('MySQL5: unhandled op: ' + op!.type)
    }
  }

  unhandled(op: Op): Error {
    return new Error('MySQL5: unhandled op: ' + op.type)
  }

  SetDefaultOp(op: SetDefaultOp): string {
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

  dataType(value: p1.Value): string {
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

  defaultValue(value: p1.Value): string {
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

  SetCreatedAtOp(op: SetCreatedAtOp): string {
    const modelName = op.p1Model.name
    const fieldName = op.p1Field.name
    const dataType = 'datetime'
    const nullable = !!~op.p1Field.type.toString().indexOf('?')
    const notNull = nullable ? '' : 'not null'
    return `alter table ${modelName} change ${fieldName} ${fieldName} ${dataType} ${notNull} default current_timestamp;`
  }
}
