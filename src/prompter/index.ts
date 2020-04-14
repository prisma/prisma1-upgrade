import prompts from 'prompts'

export interface Prompter {
  prompt(input: prompts.PromptObject<string>): Promise<prompts.Answers<string>>
}

export class Prompt implements Prompter {
  prompt(
    input: prompts.PromptObject<string>
  ): Promise<prompts.Answers<string>> {
    return prompts(input)
  }
}

export class MockPrompt implements Prompter {
  constructor(private readonly answers: { [name: string]: string } = {}) {}

  prompt(
    input: prompts.PromptObject<string>
  ): Promise<prompts.Answers<string>> {
    const name = String(input.name)
    // answer immediately
    if (this.answers[name]) {
      return Promise.resolve({
        [name]: this.answers[name],
      })
    }
    // prompt normally
    return prompts(input)
  }
}
