import { Console } from 'console'

export const console: Console = {
  async log(...args: any[]): Promise<void> {
    console.log(...args)
  },
  async sql(sql: string): Promise<void> {
    console.log(sql)
  },
  async error(...args: any[]): Promise<void> {
    console.error(...args)
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
