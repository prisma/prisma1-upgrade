const rprovider = /provider\s*\=\s*['"]([A-Za-z0-9-_]+)["']/

export default class P2 {
  static parse(p2: string): P2 {
    // const doc = parse(p2)
    // return new P2(doc)
    return new P2(p2)
  }

  private constructor(private readonly schema: string) {}

  get provider(): string | null {
    const m = this.schema.match(rprovider)
    if (!m || !m[0]) return null
    return m[1]
  }
}
