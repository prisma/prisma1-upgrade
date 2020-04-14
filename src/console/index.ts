import { Console } from 'console'

// Simpler Console interface
export interface Console {
  log(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
}

// Discard interface
export class Discard implements Console {
  log(..._args: any[]): void {}
  warn(..._args: any[]): void {}
  error(..._args: any[]): void {}
}
