import { Console } from '../console'
import { Prompter } from '../prompter'

type UpgradeInput = {
  console: Console
  prompter: Prompter
}

export async function upgrade(input: UpgradeInput): Promise<void> {
  const { console, prompter } = input
  console.log('ok', prompter)
  // const value = await prompter.prompt({
  //   type: 'text',
  //   name: 'twitter',
  //   message: `What's your twitter handle?`,
  //   initial: `terkelg`,
  //   format: (v) => `@${v}`,
  // })
  // console.log(value)
  return
}
