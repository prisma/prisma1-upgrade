# prisma-upgrade

Upgrade is a CLI tool to help Prisma 1 users upgrade to Prisma 2.

## Usage

```sh
$ prisma-upgrade datamodel.prisma schema.prisma
```

## Current features

This table reflects the _current_ feature set of the upgrade CLI and will be updated continuously. Read below for a more detailled explanation of each column. You can also find more info about each of these feautures in the [docs](https://www.prisma.io/docs/guides/upgrade-from-prisma-1/schema-incompatibilities).

| Name                                | MySQL   | PostgreSQL | Prisma schema | Prisma 1 compatible |
| ----------------------------------- | ------- | ---------- | ------------- | ------------------- |
| Default values                      | Yes     | Yes        | Yes           | Yes                 |
| @updatedAt                          | n/a     | n/a        | Yes           | Yes                 |
| Missing UNIQUE for inline 1-1       | Yes     | Yes        | Yes           | Yes                 |
| JSON                                | Yes     | Yes        | Yes           | Yes                 |
| Enums                               | Not yet | Not yet    | Not yet       | Yes                 |
| Generated IDs                       | n/a     | n/a        | Yes           | Yes                 |
| @createdAt                          | Yes     | Yes        | Yes           | Yes                 |
| Relation tables are all m-n         | Not yet | Not yet    | Not yet       | No                  |
| Scalar lists have extra table       | Not yet | Not yet    | Not yet       | No                  |
| Cascading deletes                   | No      | No         | No            | No                  |
| Maintain order of models and fields | n/a     | n/a        | Not yet       | No                  |
| Maintain relation names             | n/a     | n/a        | Not yet       | No                  |

What do the columns mean?

- **MySQL**: Does the CLI generate the correct MySQL statements to solve the problem?
- **PostgreSQL**: Does the CLI generate correct PostgreSQL statements to solve the problem?
- **Prisma schema**: Does the final Prisma schema I get from the CLI reflect the right solution?
- **Prisma 1 compatible:** Does the SQL change to the schema maintain Prisma 1 compatibility?

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
