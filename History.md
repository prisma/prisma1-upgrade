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
