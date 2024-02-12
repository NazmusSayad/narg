import {
  Action,
  MixConfig,
  NoArgConfig,
  NoArgOptions,
  defaultNoArgConfig,
} from './config'
import colors from './lib/colors'
import { getFlagInfo } from './utils'
import { CellValue } from 'cli-table3'
import { NoArgError } from './lib/extra'
import { CustomTable } from './lib/table'
import { TSchema } from './schemaType/type.t'
import { TypeBoolean, TypeArray, TypeTuple } from './schemaType/index'
import usage from './usage'

const NoArgConstructorSymbol = Symbol('NoArgConstructor')
export default class NoArg<TConfig extends NoArgOptions> {
  private options
  private action
  private config

  constructor(
    symbol: typeof NoArgConstructorSymbol,
    options: TConfig,
    action: Action<TConfig>,
    config: NoArgConfig
  ) {
    if (symbol !== NoArgConstructorSymbol) {
      throw new Error('NoArg cannot be instantiated directly')
    }

    this.action = action
    this.options = {
      ...options,
    }

    this.config = {
      ...defaultNoArgConfig,
      ...config,
    }

    if (options.options) {
      for (let name in options.options) {
        if (name.length == 0) {
          throw new Error(`Option name cannot be empty`)
        }

        if (name.startsWith('-')) {
          throw new Error(`Option name cannot start with - | "${name}"`)
        }
      }
    }
  }

  static create<
    TNewName extends Lowercase<string>,
    const TNewConfig extends Omit<NoArgOptions, 'name'> & {
      config?: NoArgConfig
    }
  >(name: TNewName, config: TNewConfig, action: Action<TNewConfig>) {
    return new NoArg(
      NoArgConstructorSymbol,
      { name, ...config },
      action as any,
      config.config ?? {}
    )
  }

  public create<
    TNewName extends Lowercase<string>,
    const TNewConfig extends Omit<NoArgOptions, 'name'>
  >(
    name: TNewName,
    options: TNewConfig,
    action: Action<
      MixConfig<typeof this.options, { name: TNewName } & TNewConfig>
    >
  ) {
    const globalOptions = Object.fromEntries(
      Object.entries(this.options.options ?? {}).filter(
        ([, type]) => type.config.global
      )
    )

    const program = new NoArg<
      MixConfig<typeof this.options, { name: TNewName } & TNewConfig>
    >(
      NoArgConstructorSymbol,
      {
        name,
        ...options,
        options: {
          ...globalOptions,
          ...options.options,
        },
      } as any,
      action as any,
      { ...this.config, parent: this } as any
    )

    this.options.programs ??= {}
    this.options.programs[name] = program as any
    return program
  }

  private parsePrograms([name, ...args]: string[]) {
    if (!this.options.programs) return false
    if (Object.keys(this.options.programs).length === 0) return false

    const program = Object.getOwnPropertyDescriptor(this.options.programs, name)
    if (!program) return false

    this.options.programs[name].run(args)
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
    this.options.arguments ??= []

    if (duplicateArgs.length < this.options.arguments.length) {
      const givenArgsCount = duplicateArgs.length
      const neededArgsCount = this.options.arguments.length
      const missingArgsCount =
        this.options.arguments.length - duplicateArgs.length

      const remainingArgs = this.options.arguments
        .slice(givenArgsCount)
        .map(({ name }) => colors.blue(name))
        .join(', ')

      throw new NoArgError(
        `Expected ${neededArgsCount} arguments, missing: ${missingArgsCount}, [${remainingArgs}]`
      )
    }

    const result = this.options.arguments.map((config) => {
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
    if (this.options.listArgument?.type) {
      const arraySchema = new TypeArray({
        schema: this.options.listArgument.type,
        minLength: this.options.listArgument.minLength,
        maxLength: this.options.listArgument.maxLength,
      })

      const [data, error] = arraySchema.parse(duplicateArgs)

      if (data) {
        listResult.push(...data)
      } else {
        throw new NoArgError(
          `${error} for list argument: ${colors.blue(
            this.options.listArgument.name
          )}`
        )
      }
    }

    return [...result, ...listResult]
  }

  private findOptionSchema(record: ReturnType<typeof getFlagInfo>) {
    if (record.optionType === 'flag') {
      const schema = this.options.options?.[record.key!]
      if (schema) return [record.key!, schema] as const
    }

    if (record.optionType === 'alias') {
      const found = Object.entries(this.options.options ?? {}).find(
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

        if (output[currentOptionKey] && !self.config.duplicateOption) {
          throw new NoArgError(
            `Duplicate option ${colors.cyan(record.raw!)} entered`
          )
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
        if (!this.config.duplicateValue) {
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

    Object.entries(this.options.options ?? {}).forEach(([key, schema]) => {
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
    let hasHelp = false
    let hasUsage = false
    args.some((current, i, array) => {
      if (current === '--help' || current === '-h') {
        hasHelp = true

        const next = array[i + 1]
        if (
          next === '--how' ||
          next === '--usage' ||
          next === '--usages' ||
          next === '-u' ||
          next === '-h'
        ) {
          hasUsage = true
        }

        return true
      }
    })

    if (this.config.help) {
      if (hasUsage) {
        this.renderUsages()
        return process.exit(0)
      }

      if (hasHelp) {
        this.renderHelp()
        return process.exit(0)
      }
    }

    const [argsList, optionsRecord] = this.divideArguments(args)
    const resultArguments = this.parseArguments(argsList)
    const resultOptions = this.parseOptions(optionsRecord)
    const output = [resultArguments, resultOptions] as unknown as Parameters<
      Action<typeof this.options>
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

  public renderUsages() {
    usage(this.config)
  }

  public renderHelp() {
    {
      console.log('')
      console.log(colors.cyan(this.options.name))

      if (this.options.description) {
        console.log(colors.dim(this.options.description))
      }
    }

    const programEntries =
      this.options.programs && Object.entries(this.options.programs)

    {
      console.log('')
      console.log(colors.bold('Usage:'))
      console.log('')

      const parents: string[] = [this.options.name]
      ;(function getParent(current: NoArg<NoArgOptions>) {
        if (!current.config.parent) return
        parents.unshift(current.config.parent.options.name)
        getParent(current.config.parent)
      })(this as any)

      const args = this.options.arguments
        ?.map((argument) => `<${argument.name}>`)
        .join(' ')

      const listArg = this.options.listArgument
        ? `[...${this.options.listArgument.name}: ${
            this.options.listArgument.type?.name ?? 'string'
          }[${
            this.options.listArgument.minLength ||
            this.options.listArgument.minLength
              ? this.options.listArgument.minLength +
                '-' +
                this.options.listArgument.maxLength
              : ''
          }]]`
        : ''

      const options =
        this.options.options && Object.keys(this.options.options).length
          ? '--[options]'
          : ''

      console.log(
        [
          colors.cyan('$'),
          parents.length && colors.black(parents.join(' ')),
          programEntries?.length && colors.green('(command)'),
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
            colors.dim(program.options.description ?? '---'),
          ]
        }
      )

      CustomTable([1, 2], ...programData)
      console.log('')
    }

    if (this.options.arguments?.length) {
      console.log(colors.dim('Arguments:'))

      const argumentData = this.options.arguments.map<
        [CellValue, CellValue, CellValue]
      >((argument) => {
        const { name, type, description } = argument
        return [
          colors.blue(name),
          colors.red(type?.name ?? 'string'),
          colors.dim(description ?? '---'),
        ]
      })

      CustomTable([5, 3, 10], ...argumentData)
      console.log('')
    }

    if (this.options.options) {
      console.log(colors.dim('Options:'))

      const optionData = Object.entries(this.options.options)
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

      CustomTable([5, 3, 10], ...optionData)
      console.log('')
    }
  }
}
