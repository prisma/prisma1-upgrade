import { IntrospectionEngine } from "@prisma/sdk"

export default class Default {
  private readonly inspector = new IntrospectionEngine()
  async inspect(schema: string): Promise<string> {
    const dm = await this.inspector.introspect(schema)
    return dm.datamodel
  }

  close(): void {
    return this.inspector.stop()
  }
}

export interface Inspector {
  inspect(schema: string): Promise<string>
  close(): void
}
