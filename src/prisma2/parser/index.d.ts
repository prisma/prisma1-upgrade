/**
 * Prisma configuration
 */

import { Schema } from '../ast'

type Parser = {
  parse(input: string, options: {}): Schema
  SyntaxError: Error
}

declare const parser: Parser
export default parser
