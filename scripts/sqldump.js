const fs = require('fs').promises
const exec = require('execa')
const path = require('path')

const root = path.join(__dirname, '..')
const prisma1 = path.join(root, 'node_modules/.bin/prisma1')
const prisma2 = path.join(root, 'node_modules/.bin/prisma')
const examples = path.join(root, 'examples')
const cwd = __dirname

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const exampleDirs = await fs.readdir(examples)
  for (let example of exampleDirs) {
    const fullpath = path.join(examples, example)
    const dcfile = path.join(fullpath, 'docker-compose.yml')
    console.log(`${example}: starting docker compose`)
    await exec('docker-compose', ['-f', dcfile, 'up', '-d'], { cwd })
    await sleep(20000)
    console.log(`${example}: deploying Prisma 1 schema`)
    const prismayml = path.join(fullpath, 'prisma.yml')
    let stdio
    try {
      stdio = await exec(prisma1, ['deploy', '-p', prismayml], { cwd })
    } catch (err) {
      if (!~err.stdout.indexOf('Your Prisma endpoint is live')) {
        throw err
      }
    }
    await sleep(20000)
    console.log(`${example}: dumping MySQL schema`)
    let dump = ''
    if (~example.indexOf(`mysql-`)) {
      const { stdout } = await exec(`mysqldump`, [
        `-u`,
        `root`,
        `-pprisma`,
        `--port`,
        `3307`,
        `--host`,
        `0.0.0.0`,
        `prisma@dev`,
        `--no-data`,
      ])
      dump = stdout
    } else if (~example.indexOf(`postgres-`)) {
      const { stdout } = await exec(`mysqldump`, [
        `-u`,
        `root`,
        `-pprisma`,
        `--port`,
        `3307`,
        `--host`,
        `0.0.0.0`,
        `prisma@dev`,
        `--no-data`,
      ])
      dump = stdout
    } else {
      throw new Error('unknown database type')
    }
    await fs.writeFile(path.join(fullpath, 'dump.sql'), dump)
    const schemaPrisma = path.join(fullpath, 'schema.prisma')
    console.log(`${example}: introspecting MySQL database`)
    await exec(
      prisma2,
      [
        'introspect',
        '--url',
        `mysql://root:prisma@0.0.0.0:3307/prisma@dev`,
        `--schema`,
        schemaPrisma,
      ],
      {
        cwd,
      }
    )
    console.log(`${example}: shutting down docker compose`)
    await exec('docker-compose', ['-f', dcfile, 'down'], { cwd })
  }
}

main().catch(console.error)
