import colors from '../lib/colors'
import { TSchema } from '../schema/type.t'
import * as inquirer from '@inquirer/prompts'
import { TypeTuple } from '../schema/TypeTuple'
import { TypeArray } from '../schema/TypeArray'
import { TypeNumber } from '../schema/TypeNumber'
import { TypeString } from '../schema/TypeString'
import { TypeBoolean } from '../schema/TypeBoolean'

const typePrompter = {
  async string(schema: TypeString.Sample, prefix = '') {
    if (schema.config.enum) {
      return this.select('string:', Array.from(schema.config.enum))
    }

    let result
    await inquirer.input({
      theme: { prefix: '' },
      message: prefix + colors.reset.yellow('string:'),
      required: schema.config.required,
      default: schema.config.default,

      validate(input: string) {
        if (!schema.config.required && !input) return true

        const { value, error, valid } = schema.parse(input)
        result = value
        if (valid) return true
        return error
      },

      transformer: schema.config.toCase
        ? (value, { isFinal }) => {
            const transformed =
              schema.config.toCase === 'upper'
                ? value.toUpperCase()
                : schema.config.toCase === 'lower'
                ? value.toLowerCase()
                : value

            return isFinal ? colors.reset.cyan(transformed) : transformed
          }
        : undefined,
    })

    return result
  },

  async number(schema: TypeNumber.Sample, prefix = '') {
    if (schema.config.enum) {
      return this.select('number:', Array.from(schema.config.enum))
    }

    let result
    await inquirer.number({
      theme: { prefix: '' },
      message: prefix + colors.reset.yellow('number:'),
      required: schema.config.required,
      default: schema.config.default,

      validate(input: any) {
        const { value, error, valid } = schema.parse(input)
        result = value
        if (valid) return true
        return error
      },
    })

    return Number(result)
  },

  async boolean(schema: TypeBoolean.Sample, prefix = '') {
    return inquirer.confirm({
      theme: { prefix: '' },
      default: schema.config.default,
      message: prefix + colors.reset.yellow('boolean:'),
    })
  },

  async array(schema: TypeArray.Sample) {
    const output: unknown[] = []

    while (true) {
      const fn = typePrompter[schema.config.schema.name]
      const result = await fn(
        schema.config.schema as any,
        colors.reset.yellow(String(output.length + 1)) + '. '
      )

      if (result) output.push(result)
      else {
        const stopAddingItems = await inquirer.confirm({
          message: colors.reset.red('Do you want to stop adding items?'),
          theme: { prefix: '#' },
        })

        if (stopAddingItems) break
      }

      if (output.length >= (schema.config.maxLength ?? Infinity)) break
    }

    return output
  },

  async tuple(schema: TypeTuple.Sample) {
    const output: unknown[] = []

    for (const childSchema of schema.config.schema) {
      const fn = typePrompter[childSchema.name]
      const result = await fn(
        childSchema as any,
        colors.reset.yellow(String(output.length + 1)) + '. '
      )

      output.push(result)
    }

    return output
  },

  async select(type: string, choices: unknown[]) {
    const result = await inquirer.select({
      theme: { prefix: '' },
      message: colors.reset.yellow(type),
      choices: choices.map((choice) => ({
        name: String(choice),
        value: choice,
      })),
    })

    return result
  },
}

export default function (schema: TSchema, prefix?: string) {
  if (schema.name in typePrompter) {
    console.log(
      [prefix, colors.bold(schema.config.askQuestion ?? 'Enter a value:')]
        .filter(Boolean)
        .join(' ')
    )

    return typePrompter[schema.name](schema as any)
  }

  throw new Error(`Unknown schema type: ${schema.name}`)
}
