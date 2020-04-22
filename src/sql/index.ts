// Partial, hand-written grammar of the SQL:2003 grammar based on:
// https://ronsavage.github.io/SQL/sql-2003-2.bnf.html#direct%20SQL%20statement
//
// This will get more flushed out as we need more of it.

export type Todo = never
export type Node = {
  type: string
}

export type Stmt = DataStmt | SchemaStmt
export type DataStmt = InsertStmt | UpdateStmt
export type SchemaStmt = SchemaDefStmt | SchemaManipulationStmt

export type InsertStmt = {
  type: 'insert_statement'
}

export type UpdateStmt = {
  type: 'update_statement'
}

export type SchemaDefStmt = SchemaDef | TableDef
export type SchemaManipulationStmt =
  | DropSchemaStmt
  | AlterTableStmt
  | DropTableStmt

export type SchemaDef = {
  type: 'schema_definition'
  name: string
}

export type TableDef = {
  type: 'table_definition'
  name: string
  contents: TableContentsSource
}

export type DropSchemaStmt = Todo
export type AlterTableStmt = {
  type: 'alter_table_statement'
  tableName: string
  actions: AlterTableAction[]
}
export type DropTableStmt = Todo

export type TableContentsSource = TableElementList

export type TableElementList = {
  elements: TableElement[]
}

export type TableElement = Todo

export type AlterTableAction =
  | AddColumnDef
  | AlterColumnDef
  | DropColumnDef
  | AddTableConstraintDef
  | DropTableConstraintDef

export type AddColumnDef = {
  type: 'add_column_definition'
}

export type AlterColumnDef = {
  type: 'alter_column_definition'
  columnName: string
  action: AlterColumnAction
}

export type AlterColumnAction =
  | SetColumnDefaultClause
  | SetColumnDataTypeClause
  | DropColumnDefaultClause
  | AddColumnScopeClause
  | DropColumnScopeClause
  | AlterIdentityColumnSpec

export type DropColumnDef = {
  type: 'drop_column_definition'
}
export type AddTableConstraintDef = {
  type: 'add_table_constraint_definition'
  constraint: TableConstraintDef
}

export type TableConstraintDef = {
  type: 'table_constraint_definition'
  name?: ConstraintNameDef
  constraint: TableConstraint
  characteristics?: ConstraintCharacteristics
}

export type ConstraintNameDef = {
  type: 'constraint_name_definition'
  name: string
}

export type TableConstraint =
  | UniqueConstraintDefinition
  | ReferentialConstraintDefinition
  | CheckConstraintDefinition

export type UniqueConstraintDefinition = {
  type: 'unique_constraint_definition'
  spec: 'UNIQUE' | 'PRIMARY KEY'
  columns: string[]
}

export type ReferentialConstraintDefinition = {
  type: 'referential_constraint_definition'
}

export type CheckConstraintDefinition = {
  type: 'check_constraint_definition'
}

export type ConstraintCharacteristics = Todo

export type DropTableConstraintDef = {
  type: 'drop_table_contraint_definition'
}

export type SetColumnDefaultClause = {
  type: 'set_column_default_clause'
  default: DefaultClause
}

// TODO: this seems to be missing from the grammar
export type SetColumnDataTypeClause = {
  type: 'set_column_datatype_clause'
  datatype: string
}

export type DropColumnDefaultClause = Todo
export type AddColumnScopeClause = Todo
export type DropColumnScopeClause = Todo
export type AlterIdentityColumnSpec = Todo

export type DefaultClause = DefaultOption
export type DefaultOption =
  | Literal
  | DateTimeValueFunction
  | USER
  | CURRENT_USER
  | CURRENT_ROLE
  | SESSION_USER
  | SYSTEM_USER
  | CURRENT_PATH
  | ImplicitlyTypedValueSpec

export type USER = Todo
export type CURRENT_USER = Todo
export type CURRENT_ROLE = Todo
export type SESSION_USER = Todo
export type SYSTEM_USER = Todo
export type CURRENT_PATH = Todo

export type Literal =
  | NumericLiteral
  | StringLiteral
  | NationalStringLiteral
  | UnicodeStringLiteral
  | BinaryStringLiteral
  | DateTimeLiteral
  | IntervalLiteral
  | BooleanLiteral

export type NumericLiteral = {
  type: 'numeric_literal'
  value: number
}

export type StringLiteral = {
  type: 'string_literal'
  value: string
}

export type NullLiteral = {
  type: 'null_literal'
  value: null
}

export type ImplicitlyTypedValueSpec = NullLiteral | EmptySpec
export type DateTimeValueFunction =
  | CurrentDateValueFunction
  | CurrentTimeValueFunction
  | CurrentTimestampValueFunction
  | CurrentLocalTimeValueFunction
  | CurrentLocalTimestampValueFunction
export type NationalStringLiteral = Todo
export type UnicodeStringLiteral = Todo
export type BinaryStringLiteral = Todo
export type DateTimeLiteral = Todo
export type IntervalLiteral = Todo
export type BooleanLiteral = {
  type: 'boolean_literal'
  value: boolean
}
export type EmptySpec = Todo

type CurrentDateValueFunction = Todo
type CurrentTimeValueFunction = Todo
type CurrentTimestampValueFunction = {
  type: 'current_timestamp_value_function'
}
type CurrentLocalTimeValueFunction = Todo
type CurrentLocalTimestampValueFunction = Todo
