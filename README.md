⚠️ **EXPERIMENTAL** This tool is being built now. It's not ready for use. Please watch this repository for updates.

# prisma-upgrade

Upgrade is a CLI tool to help Prisma 1 users upgrade to Prisma 2.

## Usage

```sh
$ prisma-upgrade datamodel.prisma schema.prisma
```

## Tests

Testing consists of 2 parts: a Local SQL Dump and Running Tests

### Local SQL Dump

_Requirements:_ MySQL@5, Docker

Since it's cumbersome to run Prisma 1 in CI, we need to locally setup test cases first

### Setting up MySQL for examples

```
mysqladmin -h localhost -u root create prisma
mysql -h localhost -u root prisma < ./examples/mysql-ablog/dump.sql
mysqladmin -h localhost -u root drop prisma -f
```

## Current features

This table reflects the _current_ feature set of the upgrade CLI and will be updated continuously. Read below for a more detailled explanation of each column.

| Name                                | MySQL | PostgreSQL | Prisma schema | Prisma 1 compatible |
| ----------------------------------- | ----- | ---------- | ------------- | ------------------- |
| Default values                      | Yes   | No         | No            | Yes                 |
| @updatedAt                          | n/a   | No         | No            | Yes                 |
| Missing UNIQUE for inline 1-1       | Yes   | No         | No            | Yes                 |
| JSON                                | Yes   | No         | No            | Yes                 |
| Enums                               | No    | No         | No            | Yes                 |
| Generated IDs                       | n/a   | No         | Yes           | No                  |
| Relation tables are all m-n         | No    | No         | No            | No                  |
| @createdAt                          | Yes   | No         | No            | No                  |
| Scalar lists have extra table       | No    | No         | No            | No                  |
| Cascading deletes                   | No    | No         | No            | No                  |
| Maintain order of models and fields | n/a   | n/a        | No            | No                  |
| Maintain relation names             | n/a   | n/a        | No            | No                  |

What do the columns mean?

- **MySQL**: Does the CLI generate the correct MySQL statements to solve the problem?
- **PostgreSQL**: Does the CLI generate correct PostgreSQL statements to solve the problem?
- **Prisma schema**: Does the final Prisma schema I get from the CLI reflect the right solution?
- **Prisma 1 compatible:** Does the SQL change to the schema maintain Prisma 1 compatibility?
