import colors from './lib/colors'
import { getFlagInfo } from './utils'
import { CellValue } from 'cli-table3'
import { NoArgError } from './lib/extra'
import { CustomTable } from './lib/table'
import { TSchema } from './schemaType/type.t'
import { Action, Config, MixConfig } from './config'
import { TypeBoolean, TypeArray, TypeTuple } from './schemaType/index'

export default class NoArg<
  TName extends Lowercase<string>,
  const TConfig extends Config
> {
  constructor(
    public name: TName,
    public config: TConfig,
    public action: Action<TConfig>
  ) {
    if (config.options) {
      for (let name in config.options) {
        if (name.length == 0) {
          throw new Error(`Option name cannot be empty`)
        }

        if (name.startsWith('-')) {
          throw new Error(`Option name cannot start with - | "${name}"`)
        }
      }
    }
  }

  public create<
    TNewName extends Lowercase<string>,
    const TNewConfig extends Config
  >(
    name: TNewName,
    config: TNewConfig,
    action: Action<MixConfig<TConfig, TNewConfig>>
  ) {
    type TMixConfig = MixConfig<TConfig, TNewConfig>

    const globalOptions = Object.fromEntries(
      Object.entries(this.config.options ?? {}).filter(
        ([, type]) => type.config.global
      )
    )

    const program = new NoArg<TNewName, TMixConfig>(
      name,
      {
        disableEqualValue: this.config.disableEqualValue,
        errorOnDuplicateOption: this.config.errorOnDuplicateOption,
        ...config,
        options: {
          ...globalOptions,
          ...(config.options ?? {}),
        },
      } as unknown as TMixConfig,
      action as Action<TMixConfig>
    )

    this.config.programs ??= {}
    this.config.programs[name] = program as any
    return program
  }

  private parsePrograms([name, ...args]: string[]) {
    if (!this.config.programs) return false
    if (Object.keys(this.config.programs).length === 0) return false

    const program = Object.getOwnPropertyDescriptor(this.config.programs, name)
    if (!program) return false

    this.config.programs[name].run(args)
    return true
  }

  private divideArguments(args: string[]) {
    let isOptionReached = false
    const argList: string[] = []
    const options: ReturnType<typeof getFlagInfo>[] = []

    for (let arg of args) {
      const result = getFlagInfo(arg)

      if (result.optionType && !isOptionReached) {
        isOptionReached = true
      }

      if (!isOptionReached) {
        argList.push(arg)
        continue
      }

      options.push(result)
    }

    return [argList, options] as const
  }

  private parseArguments(args: string[]) {
    const duplicateArgs = [...args]
    this.config.arguments ??= []

    if (duplicateArgs.length < this.config.arguments.length) {
      const givenArgsCount = duplicateArgs.length
      const neededArgsCount = this.config.arguments.length
      const missingArgsCount =
        this.config.arguments.length - duplicateArgs.length

      const remainingArgs = this.config.arguments
        .slice(givenArgsCount)
        .map(({ name }) => colors.blue(name))
        .join(', ')

      throw new NoArgError(
        `Expected ${neededArgsCount} arguments, missing: ${missingArgsCount}, [${remainingArgs}]`
      )
    }

    const result = this.config.arguments.map((config) => {
      const input = duplicateArgs.shift()!
      if (!config.type) return input
      const [data, error] = config.type.parse(input)
      if (error) {
        throw new NoArgError(
          `${error} for argument: ${colors.blue(config.name)}`
        )
      }

      return data
    })

    const listResult: any[] = []
    if (this.config.listArgument?.type) {
      const arraySchema = new TypeArray({
        schema: this.config.listArgument.type,
        minLength: this.config.listArgument.minLength,
        maxLength: this.config.listArgument.maxLength,
      })

      const [data, error] = arraySchema.parse(duplicateArgs)

      if (data) {
        listResult.push(...data)
      } else {
        throw new NoArgError(
          `${error} for list argument: ${colors.blue(
            this.config.listArgument.name
          )}`
        )
      }
    }

    return [...result, ...listResult]
  }

  private findOptionSchema(record: ReturnType<typeof getFlagInfo>) {
    if (record.optionType === 'flag') {
      const schema = this.config.options?.[record.key!]
      if (schema) return [record.key!, schema] as const
    }

    if (record.optionType === 'alias') {
      const found = Object.entries(this.config.options ?? {}).find(
        ([, schema]) => {
          return schema.config.aliases?.includes(record.key!)
        }
      )

      if (found) return found
    }

    throw new NoArgError(`Unknown option ${colors.red(record.raw)} entered`)
  }

  private parseOptionsInner([record, ...records]: ReturnType<
    typeof getFlagInfo
  >[]) {
    if (!record && records.length === 0) return {}

    const self = this
    if (!record?.optionType) {
      throw new NoArgError(
        `Something went wrong, received ${colors.yellow(record.raw)}`
      )
    }

    let currentOptionKey: string = record.raw
    const output: Record<
      string,
      {
        schema: TSchema
        optionType: Exclude<ReturnType<typeof getFlagInfo>['optionType'], null>
        values: string[]
        raw: string
      }
    > = {}

    function checkRecord(record: ReturnType<typeof getFlagInfo>) {
      if (record.optionType) {
        const [key, schema] = self.findOptionSchema(record)
        currentOptionKey = key

        if (output[currentOptionKey]) {
          if (self.config.errorOnDuplicateOption) {
            throw new NoArgError(
              `Duplicate option ${colors.cyan(record.raw!)} entered`
            )
          }
        }

        return (output[currentOptionKey] = {
          schema,
          optionType: record.optionType,
          values: record.value !== null ? [record.value] : [],
          raw: record.raw,
        })
      }

      output[currentOptionKey].values.push(record.raw)
    }

    checkRecord(record)
    records.forEach(checkRecord)
    return output
  }

  private parseOptions(records: ReturnType<typeof getFlagInfo>[]): any {
    const options = this.parseOptionsInner(records)
    const output: Record<string, any> = {}

    Object.entries(options).forEach(([key, value]) => {
      if (value.values.length === 0) {
        if (value.schema instanceof TypeBoolean) {
          return (output[key] = true)
        }

        throw new NoArgError(
          `No value given for option: ${colors.red(value.raw)}`
        )
      }

      const isList =
        value.schema instanceof TypeArray || value.schema instanceof TypeTuple

      if (!isList && value.values.length > 1) {
        if (this.config.errorOnMultipleValue) {
          throw new NoArgError(
            `Multiple value entered [${value.values
              .map(colors.green)
              .join(', ')}] for option ${colors.cyan(value.raw)}`
          )
        }

        value.values = value.values.slice(-1)
      }

      const [data, error, ok] = value.schema.parse(
        isList ? value.values : value.values[0]
      )

      if (!ok) {
        throw new NoArgError(`${error} for option: ${colors.cyan(value.raw)}`)
      }

      output[key] = data
    })

    Object.entries(this.config.options ?? {}).forEach(([key, schema]) => {
      const isExist = key in output
      const isRequired = schema.config.required
      const hasDefault = 'default' in schema.config

      if (!isExist) {
        if (hasDefault) {
          return (output[key] = schema.config.default)
        }

        if (isRequired) {
          throw new NoArgError(`Option ${colors.cyan('--' + key)} is required`)
        }
      }
    })

    return output
  }

  private runCore(args: string[]) {
    if (this.parsePrograms(args)) return

    const hasHelp = args.find((arg) => {
      return arg === '--help' || arg === '-h'
    })

    if (hasHelp && !this.config.disableHelp) {
      this.renderHelp()
      return process.exit(0)
    }

    const [argsList, optionsRecord] = this.divideArguments(args)
    const resultArguments = this.parseArguments(argsList)
    const resultOptions = this.parseOptions(optionsRecord)
    const output = [resultArguments, resultOptions, this.config] as Parameters<
      Action<TConfig>
    >

    this.action(...output)
    return output
  }

  public run(args: string[] = process.argv.slice(2)) {
    try {
      return this.runCore(args)
    } catch (error) {
      if (error instanceof NoArgError) {
        console.error(colors.red('Error:'), `${error.message}`)
        return process.exit(1)
      } else throw error
    }
  }

  public renderHelp() {
    {
      console.log('')
      console.log(colors.whiteBright(this.name))

      if (this.config.description) {
        console.log(colors.dim(this.config.description))
      }
    }

    const programEntries =
      this.config.programs && Object.entries(this.config.programs)

    {
      console.log('')
      console.log(colors.bold('Usage:'))
      console.log('')

      const args = this.config.arguments
        ?.map((argument) => `<${argument.name}>`)
        .join(' ')

      const listArg = this.config.listArgument
        ? `[...${this.config.listArgument.name}: ${
            this.config.listArgument.type?.name ?? 'string'
          }[${
            this.config.listArgument.minLength ||
            this.config.listArgument.minLength
              ? this.config.listArgument.minLength +
                '-' +
                this.config.listArgument.maxLength
              : ''
          }]]`
        : ''

      const options =
        this.config.options && Object.keys(this.config.options).length
          ? '--[options]'
          : ''

      console.log(
        [
          programEntries?.length ? colors.green('(command)') : '$',
          args && colors.red(args),
          listArg && colors.yellow(listArg),
          options && colors.blue(options),
        ]
          .filter(Boolean)
          .join(' ')
      )

      console.log('')
    }

    if (programEntries?.length) {
      console.log(colors.dim('Commands:'))
      const programData = programEntries.map<[CellValue, CellValue]>(
        ([name, program]) => {
          return [
            colors.red(name),
            colors.dim(program.config.description ?? '---'),
          ]
        }
      )

      const table = CustomTable([1, 2], ...programData)
      console.log(table.toString())
      console.log('')
    }

    if (this.config.arguments?.length) {
      console.log(colors.dim('Arguments:'))

      const argumentData = this.config.arguments.map<
        [CellValue, CellValue, CellValue]
      >((argument) => {
        const { name, type, description } = argument
        return [
          colors.blue(name),
          colors.red(type?.name ?? 'string'),
          colors.dim(description ?? '---'),
        ]
      })

      const table = CustomTable([5, 3, 10], ...argumentData)
      console.log(table.toString())
      console.log('')
    }

    if (this.config.options) {
      console.log(colors.dim('Options:'))

      const optionData = Object.entries(this.config.options)
        .sort(([, a], [, b]) => {
          const isRequired = a.config.required
          const hasDefault = 'default' in a.config

          if (isRequired && !hasDefault) {
            return -2
          }

          if (isRequired && hasDefault) {
            return -1
          }

          return 1
        })
        .map<[CellValue, CellValue, CellValue]>(([name, schema]) => {
          const aliasString = schema.config.aliases
            ? `-${schema.config.aliases
                .map((alias) => colors.cyan(alias))
                .join('\n -')}`
            : ''

          const optionName =
            '--' +
            colors.blueBright(name) +
            (aliasString ? '\n ' + aliasString : '')

          const optionType = schema.config.required
            ? colors.red(schema.name) +
              colors.black('default' in schema.config ? '?' : '*')
            : colors.yellow(schema.name) + colors.black('?')

          return [
            optionName,
            optionType,
            colors.dim(schema.config.description ?? '---'),
          ]
        })

      const table = CustomTable([5, 3, 10], ...optionData)
      console.log(table.toString())
      console.log('')
    }

    {
      console.log(colors.bold(colors.green('📝 NOTE:')))

      if (this.config.disableEqualValue) {
        console.log('  ', colors.black('Options with equal value is disabled'))
        console.log('  ', colors.green('✔   --option value'))
        console.log('  ', colors.red('✖   --option=value'))
      } else {
        console.log('  ', colors.black('Options with equal value is enabled'))
        console.log('  ', colors.green('✔   --option value'))
        console.log('  ', colors.green('✔   --option=value'))
      }

      console.log('')
    }
  }
}
