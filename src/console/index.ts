import { Console } from 'console'

const c = global.console

export const console: Console = {
  async log(...args: any[]): Promise<void> {
    c.log(...args)
  },
  async sql(sql: string): Promise<void> {
    c.log(sql)
  },
  async error(...args: any[]): Promise<void> {
    c.error(...args)
  },
}

// Simpler Console interface
export interface Console {
  log(...args: any[]): Promise<void>
  sql(sql: string): Promise<void>
  error(...args: any[]): Promise<void>
}

// Discard interface
export class Discard implements Console {
  async log(..._args: any[]): Promise<void> {}
  async sql(..._args: any[]): Promise<void> {}
  async error(..._args: any[]): Promise<void> {}
}
