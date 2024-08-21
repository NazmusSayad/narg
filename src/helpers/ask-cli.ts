import colors from '../lib/colors'
import * as inquirer from '@inquirer/prompts'

class AskCli {
  private config = {
    theme: { prefix: colors.reset('>') },
    genTitle(message: string) {
      return colors.bold(message)
    },

    genTitleWithPrefix(message: string) {
      return `${colors.reset('>')} ${colors.bold(message)}`
    },

    genMessage(message: string, type: string) {
      return `${this.genTitle(message)}\n${colors.reset.yellow(type)}:`
    },
  }

  async string(
    message: string,
    options: {
      default?: string
      required?: boolean
    } = {}
  ) {
    const result = await inquirer.input({
      ...options,
      theme: this.config.theme,
      message: this.config.genMessage(message, 'string'),
    })

    return String(result)
  }

  async number(
    message: string,
    options: {
      default?: number
      required?: boolean
      min?: number
      max?: number
    } = {}
  ) {
    const result = await inquirer.number({
      ...options,
      message: this.config.genMessage(message, 'number'),
      theme: this.config.theme,
    })

    return Number(result)
  }

  async boolean(
    message: string,
    options: {
      default?: boolean
    } = {}
  ) {
    const result = await inquirer.confirm({
      ...options,
      message: this.config.genMessage(message, 'boolean'),
    })

    return Boolean(result)
  }

  async select(
    message: string,
    options: {
      choices: unknown[]
      default?: string
    } = {
      choices: [],
    }
  ) {
    const result = await inquirer.select({
      ...options,
      message: message,
      theme: this.config.theme,
      choices: options.choices.map((choice) => ({
        name: String(choice),
        value: choice,
      })),
    })

    return result
  }

  async array(
    message: string,
    type: 'string' | 'number' | 'boolean',
    options: {
      minLength?: number
      maxLength?: number
    } = {}
  ) {
    console.log(this.config.genTitleWithPrefix(message))
    const output: unknown[] = []

    while (true) {
      const config = {
        message: colors.reset(
          `${colors.yellow(String(output.length + 1))}. ${colors.yellow(type)}:`
        ),
        theme: { prefix: '' },
        validate(value: unknown) {
          if (!value && output.length < (options.minLength ?? 0)) {
            return `At least ${colors.yellow(
              String(options.minLength)
            )} item(s) required`
          }

          return true
        },
      } as any

      const fn =
        type === 'string'
          ? inquirer.input
          : type === 'number'
          ? inquirer.number
          : inquirer.confirm

      const result = await fn(config)
      if (result) output.push(result)
      else {
        const stopAddingItems = await inquirer.confirm({
          message: colors.reset.red('Do you want to stop adding items?'),
          theme: { prefix: '#' },
        })

        if (stopAddingItems) break
      }

      if (output.length >= (options.maxLength ?? Infinity)) break
    }

    return output
  }

  async tuple(message: string, types: ('string' | 'number' | 'boolean')[]) {
    console.log(this.config.genTitleWithPrefix(message))
    const output: unknown[] = []

    for (const type of types) {
      const config = {
        message: colors.reset(
          `${String(output.length + 1)}. ${colors.yellow(type)}:`
        ),

        theme: { prefix: '' },
        isRequired: true,
      } as any

      const fn =
        type === 'string'
          ? inquirer.input
          : type === 'number'
          ? inquirer.number
          : inquirer.confirm

      const result = await fn(config)
      output.push(result)
    }

    return output
  }
}

export default new AskCli()
