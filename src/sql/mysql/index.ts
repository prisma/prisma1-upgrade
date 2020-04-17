import * as sql from '..'

// print MySQL
export default function print(stmts: sql.Stmt[]): string {
  return stmts.map(stmt).join(';\n') + ';\n'
}

function stmt(stmt: sql.Stmt): string {
  switch (stmt.type) {
    case 'alter_table_statement':
      return alterTableStmt(stmt)
    default:
      throw new Error(`mysql/print.stmt: unsupported statement "${stmt.type}"`)
  }
}

function alterTableStmt(stmt: sql.AlterTableStmt): string {
  const actions = stmt.actions.map(alterTableAction).join(',\n')
  return `ALTER TABLE ${stmt.tableName} ${actions}`
}

function alterTableAction(action: sql.AlterTableAction): string {
  switch (action.type) {
    case 'alter_column_definition':
      return alterColumnDef(action)
    default:
      throw new Error(
        `mysql/print.alterTableAction: unsupported action "${action.type}"`
      )
  }
}

function alterColumnDef(def: sql.AlterColumnDef): string {
  return `ALTER COLUMN ${def.columnName} ${alterColumnAction(def.action)}`
}

function alterColumnAction(action: sql.AlterColumnAction): string {
  switch (action.type) {
    case 'set_column_default_clause':
      return setColumnDefaultClause(action)
    case 'set_column_datatype_clause':
      return setColumnDataTypeClause(action)
    default:
      throw new Error(
        `mysql/print.alterColumnAction: unsupported action "${JSON.stringify(
          action
        )}"`
      )
  }
}

function setColumnDefaultClause(clause: sql.SetColumnDefaultClause): string {
  return `SET ${defaultClause(clause.default)}`
}

function setColumnDataTypeClause(clause: sql.SetColumnDataTypeClause): string {
  return `TYPE ${clause.datatype}`
}

function defaultClause(clause: sql.DefaultClause): string {
  return `DEFAULT ${defaultOption(clause)}`
}

function defaultOption(clause: sql.DefaultOption): string {
  switch (clause.type) {
    case 'boolean_literal':
      return booleanLiteral(clause)
    case 'null_literal':
      return nullLiteral(clause)
    case 'numeric_literal':
      return numericLiteral(clause)
    case 'string_literal':
      return stringLiteral(clause)
    case 'current_timestamp_value_function':
      return 'CURRENT_TIMESTAMP'
  }
}

function booleanLiteral(clause: sql.BooleanLiteral): string {
  return String(clause.value).toUpperCase()
}

function nullLiteral(_clause: sql.NullLiteral): string {
  return 'NULL'
}

function numericLiteral(clause: sql.NumericLiteral): string {
  return String(clause.value)
}

function stringLiteral(clause: sql.StringLiteral): string {
  return "'" + String(clause.value) + "'"
}
