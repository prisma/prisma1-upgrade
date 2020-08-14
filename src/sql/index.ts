import * as cases from "change-case"
import * as p1 from "../prisma1"
import * as p2 from "../prisma2"
import redent from "redent"

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
    case "mysql":
      return new MySQL5()
    case "postgres":
    case "postgresql":
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
  | SetEnumTypeOp
  | MigrateHasManyOp
  | MigrateOneToOneTableOp
  | AlterIDsOp
  | MigrateRequiredHasManyOp
  | MigrateScalarListOp
  | MigrateEnumListOp

export type SetDefaultOp = {
  type: "SetDefaultOp"
  schema?: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
  p1Attr: p1.Directive
  p1Enum?: p1.EnumTypeDefinition
}

export type SetCreatedAtOp = {
  type: "SetCreatedAtOp"
  schema?: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
  p1Attr: p1.Directive
}

export type AddUniqueConstraintOp = {
  type: "AddUniqueConstraintOp"
  schema?: string
  table: string
  column: string
}

export type SetJsonTypeOp = {
  type: "SetJsonTypeOp"
  schema?: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
}

export type SetNotNullOp = {
  type: "SetNotNullOp"
  schema?: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
}

export type SetEnumTypeOp = {
  type: "SetEnumTypeOp"
  schema?: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
  p1Enum: p1.EnumTypeDefinition
}

export type MigrateHasManyOp = {
  type: "MigrateHasManyOp"
  schema?: string
  p1ModelOne: p1.ObjectTypeDefinition
  p1ModelMany: p1.ObjectTypeDefinition
  p1FieldOne: p1.FieldDefinition
  p1FieldManyID: p1.FieldDefinition
  p1FieldOneID: p1.FieldDefinition
  joinTableName: string
}

export type MigrateOneToOneTableOp = {
  type: "MigrateOneToOneTableOp"
  schema?: string
  p1ModelFrom: p1.ObjectTypeDefinition
  p1ModelTo: p1.ObjectTypeDefinition
  p1FieldFrom: p1.FieldDefinition
  p1FieldToID: p1.FieldDefinition
  joinTableName: string
}

export type MigrateRequiredHasManyOp = {
  type: "MigrateRequiredHasManyOp"
  schema?: string
  p1HasOneModel: p1.ObjectTypeDefinition
  p1HasOneField: p1.FieldDefinition
  p1HasManyModel: p1.ObjectTypeDefinition
  p1HasManyField: p1.FieldDefinition
}

export type AlterIDsOp = {
  type: "AlterIDsOp"
  schema: string
  pairs: {
    model: p2.Model
    field: p2.Field
  }[]
}

export type MigrateScalarListOp = {
  type: "MigrateScalarListOp"
  schema: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
}

export type MigrateEnumListOp = {
  type: "MigrateEnumListOp"
  schema: string
  p1Model: p1.ObjectTypeDefinition
  p1Field: p1.FieldDefinition
  p1Enum: p1.EnumTypeDefinition
}

export interface Translator {
  translate(op: Op): string
}

export class Postgres implements Translator {
  translate(op: Op): string {
    switch (op.type) {
      case "SetCreatedAtOp":
        return this.SetCreatedAtOp(op)
      case "SetDefaultOp":
        return this.SetDefaultOp(op)
      case "SetJsonTypeOp":
        return this.SetJsonTypeOp(op)
      case "AddUniqueConstraintOp":
        return this.AddUniqueConstraintOp(op)
      case "SetEnumTypeOp":
        return this.SetEnumTypeOp(op)
      case "MigrateHasManyOp":
        return this.MigrateHasManyOp(op)
      case "MigrateOneToOneTableOp":
        return this.MigrateOneToOneTableOp(op)
      case "MigrateRequiredHasManyOp":
        return this.MigrateRequiredHasManyOp(op)
      case "AlterIDsOp":
        return this.AlterIDsOp(op)
      case "MigrateScalarListOp":
        return this.MigrateScalarListOp(op)
      case "MigrateEnumListOp":
        return this.MigrateEnumListOp(op)
      default:
        throw new Error("Postgres: unhandled op: " + op!.type)
    }
  }

  private schema(schema: string | undefined, table: string): string {
    return schema ? `"${schema}"."${table}"` : `"${table}"`
  }

  private SetCreatedAtOp(op: SetCreatedAtOp): string {
    const tableName = this.schema(op.schema, op.p1Model.dbname)
    const fieldName = op.p1Field.dbname
    return `ALTER TABLE ${tableName} ALTER COLUMN "${fieldName}" SET DEFAULT CURRENT_TIMESTAMP;`
  }

  private SetDefaultOp(op: SetDefaultOp): string {
    const arg = op.p1Attr.arguments.find((arg) => arg.name === "value")
    if (!arg) return ""
    const tableName = this.schema(op.schema, op.p1Model.dbname)
    const fieldName = op.p1Field.dbname
    const defaultValue = this.defaultValue(arg.value)
    return `ALTER TABLE ${tableName} ALTER COLUMN "${fieldName}" SET DEFAULT ${defaultValue};`
  }

  private defaultValue(value: p1.Value): string {
    switch (value.kind) {
      case "BooleanValue":
        return value.value ? "true" : "false"
      case "EnumValue":
        return "'" + String(value.value) + "'"
      case "IntValue":
        return String(value.value)
      case "FloatValue":
        return String(value.value)
      case "StringValue":
        return "'" + String(value.value) + "'"
      default:
        throw new Error("MySQL5: unhandled dataType: " + value!.kind)
    }
  }

  private SetJsonTypeOp(op: SetJsonTypeOp): string {
    const tableName = this.schema(op.schema, op.p1Model.dbname)
    const fieldName = op.p1Field.dbname
    return `ALTER TABLE ${tableName} ALTER COLUMN "${fieldName}" SET DATA TYPE JSONB USING "${fieldName}"::TEXT::JSONB;`
  }

  private AddUniqueConstraintOp(op: AddUniqueConstraintOp): string {
    const tableName = this.schema(op.schema, op.table)
    const fieldName = op.column
    return `ALTER TABLE ${tableName} ADD UNIQUE ("${fieldName}");`
  }

  private enums: { [name: string]: boolean } = {}

  private SetEnumTypeOp(op: SetEnumTypeOp): string {
    const stmts: string[] = []
    const tableName = this.schema(op.schema, op.p1Model.dbname)
    const enumName = this.schema(op.schema, op.p1Enum.dbname)
    const fieldName = op.p1Field.dbname
    const enumList = op.p1Enum.values.map((value) => `'${value.name}'`).join(", ")
    if (!this.enums[enumName]) {
      this.enums[enumName] = true
      stmts.push(`CREATE TYPE ${enumName} AS ENUM (${enumList});`)
    }
    stmts.push(
      `ALTER TABLE ${tableName} ALTER COLUMN "${fieldName}" SET DATA TYPE ${enumName} using "${fieldName}"::${enumName};`
    )
    return stmts.join("\n")
  }

  private MigrateHasManyOp(op: MigrateHasManyOp): string {
    const stmts: string[] = []
    const modelNameMany = op.p1ModelMany.dbname
    const modelNameOne = op.p1ModelOne.dbname
    const tableNameOne = this.schema(op.schema, modelNameOne)
    const tableNameMany = this.schema(op.schema, modelNameMany)
    const columnNameOneID = op.p1FieldOneID.name
    const columnNameMany = op.p1FieldManyID.name
    const foreignName = `${op.p1FieldOne.name}Id`
    const joinTableName = this.schema(op.schema, op.joinTableName)
    const notNull = op.p1FieldOne.optional() ? "" : "NOT NULL"
    const columnNameOneIDLetter = modelNameMany > modelNameOne ? "A" : "B"
    const foreignNameLetter = modelNameMany < modelNameOne ? "A" : "B"
    stmts.push(`ALTER TABLE ${tableNameOne} ADD COLUMN "${foreignName}" CHARACTER VARYING(25);`)
    stmts.push(
      `UPDATE ${tableNameOne} SET "${foreignName}" = ${joinTableName}."${foreignNameLetter}" FROM ${joinTableName} WHERE ${joinTableName}."${columnNameOneIDLetter}" = ${tableNameOne}."${columnNameOneID}";`
    )
    if (notNull) {
      stmts.push(`ALTER TABLE ${tableNameOne} ALTER COLUMN "${foreignName}" set ${notNull};`)
    }
    stmts.push(
      `ALTER TABLE ${tableNameOne} ADD FOREIGN KEY ("${foreignName}") REFERENCES ${tableNameMany}("${columnNameMany}");`
    )
    stmts.push(`DROP TABLE ${joinTableName};`)
    return stmts.join("\n")
  }

  private MigrateOneToOneTableOp(op: MigrateOneToOneTableOp): string {
    const stmts: string[] = []
    const p1ModelFrom = op.p1ModelFrom
    const p1ModelTo = op.p1ModelTo
    const p1FieldToID = op.p1FieldToID

    const notNull = op.p1FieldFrom.type.optional() ? "" : "NOT NULL"
    const modelFromName = this.schema(op.schema, p1ModelFrom.dbname)
    const modelFromColumn = cases.camelCase(p1ModelTo.name + " " + p1FieldToID.name)
    const fieldIDName = p1FieldToID.name
    const modelToName = this.schema(op.schema, p1ModelTo.dbname)
    const joinTableName = this.schema(op.schema, op.joinTableName)
    stmts.push(`ALTER TABLE ${modelFromName} ADD COLUMN "${modelFromColumn}" character varying(25) ${notNull} UNIQUE;`)
    stmts.push(
      `ALTER TABLE ${modelFromName} ADD FOREIGN KEY ("${modelFromColumn}") REFERENCES ${modelToName} ("${fieldIDName}");`
    )
    stmts.push(`DROP TABLE ${joinTableName};`)
    return stmts.join("\n")
  }

  private MigrateRequiredHasManyOp(op: MigrateRequiredHasManyOp): string {
    const stmts: string[] = []
    const hasOneModelName = this.schema(op.schema, op.p1HasOneModel.dbname)
    const hasManyModelName = this.schema(op.schema, op.p1HasManyModel.dbname)
    const hasManyFieldName = op.p1HasManyField.name
    const hasOneFieldName = op.p1HasOneField.name
    const constraintName = `${op.p1HasOneModel.dbname}_${hasOneFieldName}_fkey`
    stmts.push(
      undent(`
      ALTER TABLE ${hasOneModelName} DROP CONSTRAINT "${constraintName}",
      ADD CONSTRAINT "${constraintName}" FOREIGN KEY ("${hasOneFieldName}") REFERENCES ${hasManyModelName}("${hasManyFieldName}"),
      ALTER COLUMN "${hasOneFieldName}" SET NOT NULL;
    `)
    )
    return stmts.join("\n")
  }

  private AlterIDsOp(op: AlterIDsOp): string {
    const stmts: string[] = []
    for (let pair of op.pairs) {
      const modelName = this.schema(op.schema, pair.model.dbname)
      const fieldName = pair.field.dbname
      stmts.push(`ALTER TABLE ${modelName} ALTER COLUMN "${fieldName}" SET DATA TYPE character varying(30);`)
    }
    return stmts.join("\n")
  }

  private MigrateEnumListOp(op: MigrateEnumListOp): string {
    const stmts: string[] = []
    const modelName = this.schema(op.schema, op.p1Model.dbname)
    const fieldName = op.p1Field.dbname
    const typeString = op.p1Field.type.toString().replace(/^\[+|\]+!*$/g, "")
    const notNull = typeString[typeString.length - 1] === "!"
    const typeTable = `${op.p1Model.dbname}_${fieldName}`
    const typeName = this.schema(op.schema, typeTable)
    const enm = op.p1Enum
    const enumName = this.schema(op.schema, enm.dbname)
    const values = enm.values.map((v) => `'${v.name}'`).join(", ")
    stmts.push(`CREATE TYPE ${enumName} AS ENUM (${values});`)
    stmts.push(`ALTER TABLE ${modelName} ADD COLUMN "${fieldName}" ${enumName}[];`)
    stmts.push(
      undent(`
        UPDATE ${modelName} u
          SET "${fieldName}" = t."value"::${enumName}[]
        FROM (
          SELECT "nodeId", array_agg(value ORDER BY position) as value
          FROM ${typeName}
          GROUP BY "nodeId"
        ) t
        WHERE t."nodeId" = u."id";
      `)
    )
    if (notNull) {
      stmts.push(`ALTER TABLE ${modelName} ALTER COLUMN "${fieldName}" SET NOT NULL;`)
    }
    stmts.push(`DROP TABLE ${typeName};`)
    return stmts.join("\n")
  }

  private MigrateScalarListOp(op: MigrateScalarListOp): string {
    const stmts: string[] = []
    const modelName = this.schema(op.schema, op.p1Model.dbname)
    const fieldName = op.p1Field.dbname
    const typeTable = `${op.p1Model.dbname}_${fieldName}`
    const typeName = this.schema(op.schema, typeTable)
    const type = this.namedTypeToPgType(op.p1Field.type.named())
    const typeString = op.p1Field.type.toString().replace(/^\[+|\]+!*$/g, "")
    const notNull = typeString[typeString.length - 1] === "!"
    stmts.push(`ALTER TABLE ${modelName} ADD COLUMN "${fieldName}" ${type}[];`)
    stmts.push(
      undent(`
        UPDATE ${modelName} u
          SET "${fieldName}" = t."value"::${type}[]
        FROM (
          SELECT "nodeId", array_agg(value ORDER BY position) as value
          FROM ${typeName}
          GROUP BY "nodeId"
        ) t
        WHERE t."nodeId" = u."id";
      `)
    )
    if (notNull) {
      stmts.push(`ALTER TABLE ${modelName} ALTER COLUMN "${fieldName}" SET NOT NULL;`)
    }
    stmts.push(`DROP TABLE ${typeName};`)
    return stmts.join("\n")
  }

  namedTypeToPgType(type: string): string {
    switch (type) {
      case "String":
        return "text"
      case "Int":
        return "integer"
      case "Float":
        return "double"
      case "DateTime":
        return "timestamp"
      case "Json":
        return "json"
      case "Boolean":
        return "boolean"
      default:
        // enum
        return "text"
    }
  }
}

export class MySQL5 implements Translator {
  translate(op: Op): string {
    switch (op.type) {
      case "SetDefaultOp":
        return this.SetDefaultOp(op)
      case "SetCreatedAtOp":
        return this.SetCreatedAtOp(op)
      case "AddUniqueConstraintOp":
        return this.AddUniqueConstraintOp(op)
      case "SetJsonTypeOp":
        return this.SetJsonTypeOp(op)
      case "SetEnumTypeOp":
        return this.SetEnumTypeOp(op)
      case "MigrateHasManyOp":
        return this.MigrateHasManyOp(op)
      case "MigrateOneToOneTableOp":
        return this.MigrateOneToOneTableOp(op)
      case "MigrateRequiredHasManyOp":
        return this.MigrateRequiredHasManyOp(op)
      case "AlterIDsOp":
        return this.AlterIDsOp(op)
      default:
        throw new Error("MySQL5: unhandled op: " + op!.type)
    }
  }

  private backtick(ident: string): string {
    return "`" + ident + "`"
  }

  private SetDefaultOp(op: SetDefaultOp): string {
    const arg = op.p1Attr.arguments.find((arg) => arg.name === "value")
    if (!arg) return ""
    const modelName = this.backtick(op.p1Model.dbname)
    const fieldName = this.backtick(op.p1Field.dbname)
    const dataType = this.dataType(arg.value, op.p1Enum)
    const notNull = op.p1Field.optional() ? "" : "NOT NULL"
    const defaultValue = this.defaultValue(arg.value)
    return `ALTER TABLE ${modelName} CHANGE ${fieldName} ${fieldName} ${dataType} ${notNull} DEFAULT ${defaultValue};`
  }

  private dataType(value: p1.Value, p1Enum?: p1.EnumTypeDefinition): string {
    switch (value.kind) {
      case "BooleanValue":
        return `TINYINT(1)`
      case "EnumValue":
        if (p1Enum) {
          const enumList = p1Enum.values.map((value) => `'${value.name}'`).join(", ")
          return `ENUM(${enumList})`
        }
        return `VARCHAR(191)`
      case "IntValue":
        return `INT(11)`
      case "FloatValue":
        return `DECIMAL(65,30)`
      case "StringValue":
        return `MEDIUMTEXT`
      default:
        throw new Error("MySQL5: unhandled dataType: " + value!.kind)
    }
  }

  private defaultValue(value: p1.Value): string {
    switch (value.kind) {
      case "BooleanValue":
        return value.value ? "1" : "0"
      case "EnumValue":
        return "'" + String(value.value) + "'"
      case "IntValue":
        return String(value.value)
      case "FloatValue":
        return String(value.value)
      case "StringValue":
        return "'" + String(value.value) + "'"
      default:
        throw new Error("MySQL5: unhandled dataType: " + value!.kind)
    }
  }

  private SetCreatedAtOp(op: SetCreatedAtOp): string {
    const modelName = this.backtick(op.p1Model.dbname)
    const fieldName = this.backtick(op.p1Field.dbname)
    const dataType = "DATETIME"
    const notNull = op.p1Field.optional() ? "" : "NOT NULL"
    return `ALTER TABLE ${modelName} CHANGE ${fieldName} ${fieldName} ${dataType} ${notNull} DEFAULT CURRENT_TIMESTAMP;`
  }

  private AddUniqueConstraintOp(op: AddUniqueConstraintOp): string {
    const modelName = this.backtick(op.table)
    const fieldName = this.backtick(op.column)
    return `ALTER TABLE ${modelName} ADD UNIQUE (${fieldName});`
  }

  private SetJsonTypeOp(op: SetJsonTypeOp): string {
    const modelName = this.backtick(op.p1Model.dbname)
    const fieldName = this.backtick(op.p1Field.dbname)
    const notNull = op.p1Field.optional() ? "" : "NOT NULL"
    return `ALTER TABLE ${modelName} CHANGE ${fieldName} ${fieldName} JSON ${notNull};`
  }

  private SetEnumTypeOp(op: SetEnumTypeOp): string {
    const modelName = this.backtick(op.p1Model.dbname)
    const fieldName = this.backtick(op.p1Field.dbname)
    const notNull = op.p1Field.optional() ? "" : "NOT NULL"
    const enumList = op.p1Enum.values.map((value) => `'${value.name}'`).join(", ")
    return `ALTER TABLE ${modelName} CHANGE ${fieldName} ${fieldName} ENUM(${enumList}) ${notNull};`
  }

  private MigrateHasManyOp(op: MigrateHasManyOp): string {
    const stmts: string[] = []
    const modelNameMany = op.p1ModelMany.dbname
    const modelNameOne = op.p1ModelOne.dbname
    const tableNameOne = this.backtick(modelNameOne)
    const tableNameMany = this.backtick(modelNameMany)
    const columnNameOneID = this.backtick(op.p1FieldOneID.name)
    const columnNameMany = this.backtick(op.p1FieldManyID.name)
    const foreignName = this.backtick(`${op.p1FieldOne.name}Id`)
    const notNull = op.p1FieldOne.optional() ? "" : "NOT NULL"
    const joinTableName = this.backtick(op.joinTableName)
    const foreignNameLetter = modelNameMany < modelNameOne ? "A" : "B"
    const columnNameOneIDLetter = modelNameMany > modelNameOne ? "A" : "B"

    stmts.push(`ALTER TABLE ${tableNameOne} ADD COLUMN ${foreignName} char(25) CHARACTER SET utf8;`)
    stmts.push(
      `UPDATE ${tableNameOne}, ${joinTableName} SET ${tableNameOne}.${foreignName} = ${joinTableName}.${foreignNameLetter} where ${joinTableName}.${columnNameOneIDLetter} = ${tableNameOne}.${columnNameOneID};`
    )
    if (notNull) {
      stmts.push(
        `ALTER TABLE ${tableNameOne} CHANGE ${foreignName} ${foreignName} char(25) CHARACTER SET utf8 ${notNull};`
      )
    }
    stmts.push(
      `ALTER TABLE ${tableNameOne} ADD FOREIGN KEY (${foreignName}) REFERENCES ${tableNameMany}(${columnNameMany});`
    )
    stmts.push(`DROP TABLE ${joinTableName};`)
    return stmts.join("\n")
  }

  private MigrateOneToOneTableOp(op: MigrateOneToOneTableOp): string {
    const stmts: string[] = []
    const p1ModelFrom = op.p1ModelFrom
    const p1ModelTo = op.p1ModelTo
    const p1FieldToID = op.p1FieldToID

    const notNull = op.p1FieldFrom.type.optional() ? "" : "NOT NULL"
    const modelFromName = this.backtick(p1ModelFrom.dbname)
    const modelFromColumn = this.backtick(cases.camelCase(p1ModelTo.name + " " + p1FieldToID.name))
    const fieldIDName = this.backtick(p1FieldToID.name)
    const modelToName = this.backtick(p1ModelTo.dbname)
    const joinTableName = this.backtick(op.joinTableName)
    stmts.push(
      `ALTER TABLE ${modelFromName} ADD COLUMN ${modelFromColumn} char(25) CHARACTER SET UTF8 ${notNull} UNIQUE;`
    )
    stmts.push(
      `ALTER TABLE ${modelFromName} ADD FOREIGN KEY (${modelFromColumn}) REFERENCES ${modelToName} (${fieldIDName});`
    )
    stmts.push(`DROP TABLE ${joinTableName};`)
    return stmts.join("\n")
  }

  private MigrateRequiredHasManyOp(_op: MigrateRequiredHasManyOp): string {
    return undent(`
      -- Warning: MySQL required has-many's are not supported yet,
      -- see https://github.com/prisma/upgrade/issues/56 for the
      -- details on how to fix this yourself.
    `)
  }

  private AlterIDsOp(op: AlterIDsOp): string {
    const stmts: string[] = []
    stmts.push(`SET FOREIGN_KEY_CHECKS=0;`)
    for (let pair of op.pairs) {
      const modelName = this.backtick(pair.model.dbname)
      const fieldName = this.backtick(pair.field.dbname)
      const notNull = pair.field.type.optional() ? "" : "NOT NULL"
      stmts.push(`ALTER TABLE ${modelName} CHANGE ${fieldName} ${fieldName} char(30) CHARACTER SET utf8 ${notNull};`)
    }
    stmts.push(`SET FOREIGN_KEY_CHECKS=1;`)
    return stmts.join("\n")
  }
}

function undent(str: string): string {
  return redent(str).trim()
}
