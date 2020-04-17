#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const filepath = path.join(
  __dirname,
  '..',
  'src',
  'prisma2',
  'parser',
  'index.js'
)
let parser = fs.readFileSync(filepath, 'utf8')
parser = parser.replace('module.exports =', 'export default ')
fs.writeFileSync(filepath, parser)
