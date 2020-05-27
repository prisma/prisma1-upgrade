import * as p1 from '../prisma1'
import * as p2 from '../prisma2'

type P1Model = p1.ObjectTypeDefinition
type P2Model = p2.Model
type P1Field = p1.FieldDefinition
type P2Field = p2.Field
type P1Attr = p1.Directive
type P2Attr = p2.Attribute

export function diffP1Models(p1s: P1Model[], p2s: P2Model[]): P1Model[] {
  const out: P1Model[] = []
  outer: for (let p1 of p1s) {
    for (let p2 of p2s) {
      if (p1.name === p2.name) {
        continue outer
      }
    }
    out.push(p1)
  }
  return out
}

export function diffP2Models(p1s: P1Model[], p2s: P2Model[]): P2Model[] {
  const out: P2Model[] = []
  outer: for (let p2 of p2s) {
    for (let p1 of p1s) {
      if (p2.name === p1.name) {
        continue outer
      }
    }
    out.push(p2)
  }
  return out
}

export function diffP1Fields(p1s: P1Field[], p2s: P2Field[]): P1Field[] {
  const out: P1Field[] = []
  outer: for (let p1 of p1s) {
    for (let p2 of p2s) {
      if (p1.name === p2.name) {
        continue outer
      }
    }
    out.push(p1)
  }
  return out
}

export function diffP2Fields(p1s: P1Field[], p2s: P2Field[]): P2Field[] {
  const out: P2Field[] = []
  outer: for (let p2 of p2s) {
    for (let p1 of p1s) {
      if (p2.name === p1.name) {
        continue outer
      }
    }
    out.push(p2)
  }
  return out
}

export function diffP1Attrs(p1s: P1Attr[], p2s: P2Attr[]): P1Attr[] {
  const out: P1Attr[] = []
  outer: for (let p1 of p1s) {
    for (let p2 of p2s) {
      if (p1.name === p2.name) {
        continue outer
      }
    }
    out.push(p1)
  }
  return out
}

export function diffP2Attrs(p1s: P1Attr[], p2s: P2Attr[]): P2Attr[] {
  const out: P2Attr[] = []
  outer: for (let p2 of p2s) {
    for (let p1 of p1s) {
      if (p2.name === p1.name) {
        continue outer
      }
    }
    out.push(p2)
  }
  return out
}

export function intersectModels(
  p1s: P1Model[],
  p2s: P2Model[]
): [P1Model, P2Model][] {
  const out: [P1Model, P2Model][] = []
  for (let p1 of p1s) {
    for (let p2 of p2s) {
      if (p1.name === p2.name) {
        out.push([p1, p2])
      }
    }
  }
  return out
}

export function intersectFields(
  p1s: P1Field[],
  p2s: P2Field[]
): [P1Field, P2Field][] {
  const out: [P1Field, P2Field][] = []
  for (let p1 of p1s) {
    for (let p2 of p2s) {
      if (p1.name === p2.name) {
        out.push([p1, p2])
      }
    }
  }
  return out
}

export function intersectAttrs(
  p1s: P1Attr[],
  p2s: P2Attr[]
): [P1Attr, P2Attr][] {
  const out: [P1Attr, P2Attr][] = []
  for (let p1 of p1s) {
    for (let p2 of p2s) {
      if (p1.name === p2.name) {
        out.push([p1, p2])
      }
    }
  }
  return out
}
