function diff(a, b) {
  const out = []
  outer: for (let v of a) {
    for (let u of b) {
      if (v === u) {
        continue outer
      }
    }
    out.push(v)
  }
  return out
}

console.log(diff([1, 2, 3], [3, 4]))
