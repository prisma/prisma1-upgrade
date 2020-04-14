import P1 from '../p1'

describe('@default value is missing', () => {
  it('should translate', () => {
    const p1 = P1.parse(`
      type User {
        isActive: Boolean! @default(value: false)
      }
    `)
    console.log(p1.objectTypeDefinitions[0].fields[0].name)
    console.log(p1.objectTypeDefinitions[0].fields[0].directives[0].name)
    console.log(
      p1.objectTypeDefinitions[0].fields[0].directives[0].arguments[0].name
    )
    console.log(
      p1.objectTypeDefinitions[0].fields[0].directives[0].arguments[0].value
    )
    // console.log('translating')
  })
})
