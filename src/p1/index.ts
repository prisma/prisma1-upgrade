import { DocumentNode, DefinitionNode } from 'graphql/language/ast'
import { parse } from 'graphql/language/parser'

export default class P1 {
  static parse(p1: string): P1 {
    const doc = parse(p1)
    return new P1(doc)
  }

  private constructor(private readonly doc: DocumentNode) {}

  get definitions(): Definition[] {
    return this.doc.definitions.map((def) => new Definition(this.doc, def))
  }
}

class Definition {
  constructor(readonly _doc: DocumentNode, readonly _def: DefinitionNode) {}
}
