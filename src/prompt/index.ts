import readline from 'readline'

export async function prompt(question: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

export async function confirm(question: string): Promise<boolean> {
  const answer = await prompt(question)
  const yn = yesNo(answer)
  if (yn === true || yn === false) {
    return yn
  }
  return confirm(question)
}

function yesNo(value: string): boolean | void {
  if (/^(yes|ok|ack|true|y)$/i.test(value)) return true
  if (/^(no|nope|nack|false|n)$/i.test(value)) return false
  return
}
