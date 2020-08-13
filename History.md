# 0.0.36 / 2020-08-13

- maintain relationship names from Prisma 1. Closes #25

# 0.0.35 / 2020-07-28

- support nullable lists in Postgres, even though Prisma 2 doesn't yet support this from a client perspective

# 0.0.34 / 2020-07-27

- expose scalar list updates in `0.0.33` to the CLI

# 0.0.33 / 2020-07-27

- add support for all scalar lists including enums (_Postgres only_)

# 0.0.32 / 2020-07-22

- add required has-many support for postgres, add a warning for mysql. Fixes: #38

# 0.0.31 / 2020-07-21

- bump prismafile. fixes: #54.

# 0.0.30 / 2020-07-21

- remove explicit constraint name to allow the db to pick the name. fixes #46
- Add docs link to ID migration section in CLI output

# 0.0.29 / 2020-07-14

- fix column ordering for table relations
- fix indentation for multi-line queries
- fix ids and update tests
- migrate varchar(25) => varchar(30)
- identify ids and columns with foreign keys

# 0.0.28 / 2020-07-13

- fix has-many operation for Postgres & MySQL using example data. Thanks @Aldrian!
- remove datasource from all tests in order to make tests more portable

# 0.0.27 / 2020-07-09

- fix alphanumeric issue with join table

# 0.0.26 / 2020-07-07

- remove console.log

# 0.0.25 / 2020-07-07

- fix has-many SQL statements for DM1.0 (thanks @alan345!)

# 0.0.24 / 2020-07-03

- add support for self-relations

# 0.0.23 / 2020-07-01

- fix 1:N relationships with link:TABLE. add NOT NULL to required 1:1 and 1:N link:TABLE queries. add @db support for the 1:1 and 1:N relationship with link:TABLE
- fix prisma.schema => schema.prisma
- fix message indentation

# 0.0.22 / 2020-06-24

- add tests with both breaking changes and normal changes
- add support for one-to-one relationships in DM1.0 for postgres and mysql
- add breaking ops for 1-to-1 relations in DM1.0
- add support for one-to-many breaking changes. updated the tests
- remove unused functions
- chore: add security email to README

# 0.0.21 / 2020-06-17

- Fix postgres defaults enum (see [note in original commit](https://github.com/prisma/upgrade/commit/c819cfd7d25f43834402d5bd527409b297d1bf03) for caveat message.)
- Cleanup old tests.
- Setup sqldump to work with DM 1.0.
- Add self-relation tests (not passing yet).

# 0.0.20 / 2020-06-12

- add expected.sql to all tests
- fix @createdAt regression
- fix 1-1 unique regression.

# 0.0.19 / 2020-06-09

- ignore 1-to-1 relations that have link: Table

# 0.0.18 / 2020-06-09

- bump prismafile to support comments in P2 schema.
- improve error handling

# 0.0.17 / 2020-06-09

- fix mysql default json.
- improve not null handling in mysql.
- fix cli messaging around enums.

# 0.0.16 / 2020-06-09

- workaround dbgenerated introspection issue for enums with defaults in postgres
- fix mysql5 default text issue
- fix regression where @createdAt getting added superfluously

# 0.0.15 / 2020-06-08

- add support for L: 1-1 relation with both sides required
- add support for @map and @@map

# 0.0.14 / 2020-06-08

- prep for addressing L.
- add test for postgres aliasing
- add K: @db aliasing
- fix tests.
- add better help messages
- make npx the default everywhere

# 0.0.13 / 2020-06-08

- add support for migrating scalar enums. fix missing dependency.
- add missing rollup dependencies
- cleanup unused function

# 0.0.12 / 2020-06-05

- remove @updatedAt setting a default timestamp
- add prettier

# 0.0.11 / 2020-06-05

- cleanup dependencies.
- add ability to skip sql.
- add more commentary.
- add soft clear.

# 0.0.10 / 2020-06-03

- fix version

# 0.0.9 / 2020-06-03

- added a bunch of writing into the tool. uppercase SQL. support env variables inmside prisma.yml
- added multiple datamodel support, support env(...), adjusted signature to prisma.yml schema.prisma, wrapped mysql commands in backticks
- **BREAKING:** We now ask for the `prisma.yml` instead of `datamodel.graphql`

# 0.0.8 / 2020-05-20

- fix schema introspection
- fix: build config

# 0.0.7 / 2020-05-18

- support writing out the final p2 schema

# 0.0.6 / 2020-05-18

- fix @default(cuid()) and @default(uuid())

# 0.0.5 / 2020-05-15

- upgrade prismafile
- fix @updatedAt, remove @default(now())

# 0.0.4 / 2020-05-14

- fix default enums. log the final p2 (temporary)

# 0.0.3 / 2020-05-14

- cleanup dist file

# 0.0.2 / 2020-05-14

- fix console, test blog schema
- mysql 5 test working
- fix up parser and cli
- fix uuid() support
- add prisma 2 printer, support cuid and uuid, support re-introspect, support json
- add initial support for detecting and fixing 1:1 relations with @relation and @relation(link:INLINE)

# 0.0.1 / 2020-04-17

- fix package paths

# 0.0.0 / 2020-04-17

- initial release
