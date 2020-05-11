# prisma-upgrade

Upgrade is a CLI tool to help Prisma 1 users upgrade to Prisma 2.

⚠️ This tool is being built now. Please watch this repository for updates.

## Usage

```sh
$ prisma-upgrade datamodel.prisma schema.prisma
```

## Tests

Testing consists of 2 parts: a Local SQL Dump and Running Tests

### Local SQL Dump

_Requirements:_ MySQL@5, Docker

Since it's cumbersome to run Prisma 1 in CI, we need to locally setup test cases first
