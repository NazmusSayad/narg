import {
  Action,
  MixConfig,
  NoArgConfig,
  NoArgOptions,
  FlagRecord,
} from './config-type'
import usage from './usage'
import colors from './lib/colors'
import { Prettify } from './utils'
import { CellValue } from 'cli-table3'
import { NoArgError } from './lib/extra'
import { CustomTable } from './lib/table'
import { TSchema } from './schemaType/type.t'
import { TypeBoolean, TypeArray, TypeTuple } from './schemaType/index'
import { defaultNoArgConfig } from './config'
import * as readLineSync from 'readline-sync'

export default class NoArg<TConfig extends NoArgOptions> {
  private options
  private action
  private config

  static verifyOptionName(
    type: string,
    string: string,
    booleanFalsePrefixSuffix?: string
  ) {
    if (string.length == 0) {
      throw new Error(`${type} name cannot be empty`)
    }

    if (string.includes(' ')) {
      throw new Error(`${type} "${string}" can not contain spaces`)
    }

    if (string.startsWith('-')) {
      throw new Error(`${type} "${string}" should not start with "-"`)
    }

    if (booleanFalsePrefixSuffix && string.includes(booleanFalsePrefixSuffix)) {
      throw new Error(
        `${type} "${string}" should not contain "${booleanFalsePrefixSuffix}"`
      )
    }

    if (string.includes('=')) {
      throw new Error(`${type} "${string}" should not contain "="`)
    }
  }

  constructor(
    symbol: typeof NoArgConstructorSymbol,
    options: TConfig,
    action: Action<TConfig>,
    config: NoArgConfig
  ) {
    if (symbol !== NoArgConstructorSymbol) {
      throw new Error('NoArg cannot be instantiated directly')
    }

    options.options &&
      Object.keys(options.options).forEach((name) => {
        NoArg.verifyOptionName('Flag', name, config.booleanFalsePrefixSuffix)
      })

    this.action = action
    this.options = {
      ...options,
    }

    this.config = {
      ...defaultNoArgConfig,
      ...config,
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
    const options: FlagRecord[] = []

    for (let arg of args) {
      const result = this.parseFlag(arg)

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
    this.options.optionalArguments ??= []

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

    const resultArgs = this.options.arguments.map((config) => {
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

    const resultOptArgs = this.options.optionalArguments?.map((config) => {
      if (duplicateArgs.length === 0) return null
      const input = duplicateArgs.shift()!
      if (!config.type) return input
      const [data, error] = config.type.parse(input)
      if (error) {
        throw new NoArgError(
          `${error} for optional argument: ${colors.blue(config.name)}`
        )
      }

      return data
    })

    const resultList: any[] = []
    if (this.options.listArgument?.type) {
      const arraySchema = new TypeArray({
        schema: this.options.listArgument.type,
        minLength: this.options.listArgument.minLength,
        maxLength: this.options.listArgument.maxLength,
      })

      const [data, error] = arraySchema.parse(duplicateArgs)

      if (data) {
        resultList.push(...data)
      } else {
        throw new NoArgError(
          `${error} for list argument: ${colors.blue(
            this.options.listArgument.name
          )}`
        )
      }
    }

    return { resultArgs, resultOptArgs, resultList }
  }

  private findOptionSchema(record: FlagRecord) {
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

  private parseOptionsInner([record, ...records]: FlagRecord[]) {
    if (!record && records.length === 0) return {}
    const self = this
    if (!record?.optionType) {
      throw new NoArgError(
        `Something went wrong, received ${colors.yellow(
          record.raw
        )}. Expected an option`
      )
    }

    let currentOptionKey: string = record.raw
    const output: Record<
      string,
      Prettify<
        FlagRecord & {
          schema: TSchema
          values: string[]
          optionType: Exclude<FlagRecord['optionType'], null>
        }
      >
    > = {}

    function checkRecord(record: FlagRecord) {
      if (record.key) {
        try {
          NoArg.verifyOptionName(
            'Option',
            record.key,
            self.config.booleanFalsePrefixSuffix
          )
        } catch (err: any) {
          throw new NoArgError(
            err.message + ' for option ' + colors.red(record.raw)
          )
        }
      }

      if (record.optionType) {
        const [key, schema] = self.findOptionSchema(record)
        currentOptionKey = key

        if (output[currentOptionKey] && !self.config.duplicateOption) {
          throw new NoArgError(
            `Duplicate option ${colors.cyan(record.raw!)} entered`
          )
        }

        if (record.hasBooleanEndValue) {
          if (schema instanceof TypeBoolean) record.value = 'false'
          else
            throw new NoArgError(
              `Only boolean types accept '${
                self.config.booleanFalsePrefixSuffix
              }' assignment for option: ${colors.red(record.raw)}`
            )
        }

        return (output[currentOptionKey] = {
          schema,
          values: record.value !== null ? [record.value] : [],

          ...(record as typeof record & {
            optionType: typeof record.optionType
          }),
        })
      }

      output[currentOptionKey].values.push(record.raw)
    }

    checkRecord(record)
    records.forEach(checkRecord)
    return output
  }

  private parseFlag(arg: string) {
    const isFlag = FlagRegexp.test(arg)
    const isAlias = AliasRegexp.test(arg)
    const optionType = isFlag
      ? ('flag' as const)
      : isAlias
      ? ('alias' as const)
      : null

    let key = isFlag ? arg.slice(2) : isAlias ? arg.slice(1) : null
    let value = null
    let hasBooleanEndValue = false

    if (key) {
      const hasValue = OptionWithValueRegexp.test(key)

      if (hasValue) {
        const { value: _value = null, key: _key = null } =
          key.match(OptionWithValueRegexp)?.groups ?? {}

        key = _key
        value = _value
      } else if (
        this.config.booleanFalsePrefixSuffix &&
        key.endsWith(this.config.booleanFalsePrefixSuffix)
      ) {
        key = key.slice(0, -1)
        hasBooleanEndValue = true
      }
    }

    return {
      raw: arg,
      key,
      value,
      optionType,
      hasBooleanEndValue,
    }
  }

  private parseOptions(records: FlagRecord[]): any {
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
      const hasValue = key in output
      const isRequired = schema.config.required
      const hasDefault = 'default' in schema.config

      if (!hasValue) {
        if (schema.config.ask) {
          while (true) {
            const input = readLineSync.question(
              `--${colors.red(key)} ${colors.cyan(
                schema.config.ask
              )}\n${colors.yellow(schema.name)}${hasDefault ? '?' : ''}: `,
              { defaultInput: schema.config.default }
            )

            const [result, error, ok] = schema.parse(input)
            if (ok) return (output[key] = result)

            console.log(colors.red(error))
            console.log('')
          }
        }

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

    if (this.config.help) {
      let hasHelp = false
      let hasUsage = false
      args.some((current) => {
        if (current === '--help') {
          hasHelp = true
          return true
        }

        if (current === '--help-use') {
          hasUsage = true
          return true
        }
      })

      if (hasHelp || hasUsage) {
        console.clear()
        hasHelp && this.renderHelp()
        hasUsage && this.renderUsages()
        return process.exit(0)
      }
    }

    const [argsList, optionsRecord] = this.divideArguments(args)
    const { resultArgs, resultOptArgs, resultList } =
      this.parseArguments(argsList)
    const resultOptions = this.parseOptions(optionsRecord)

    const output = {
      options: resultOptions,
      args: resultArgs,
      optArgs: resultOptArgs,
      listArgs: resultList,
    } as unknown as Parameters<Action<typeof this.options>>
    this.action(output as any)

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

      const optArgs = this.options.optionalArguments
        ?.map((argument) => `<${argument.name}>?`)
        .join(' ')

      const listArg = this.options.listArgument
        ? `<${this.options.listArgument.name}: ${
            this.options.listArgument.type?.name ?? 'string'
          }>[${
            this.options.listArgument.minLength ||
            this.options.listArgument.minLength
              ? this.options.listArgument.minLength +
                '-' +
                this.options.listArgument.maxLength
              : ''
          }]`
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
          optArgs && colors.blue(optArgs),
          listArg && colors.green(listArg),
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

    if (
      this.options.arguments?.length ||
      this.options.optionalArguments?.length
    ) {
      console.log(colors.dim('Arguments:'))

      const argumentData = this.options.arguments?.map<
        [CellValue, CellValue, CellValue]
      >((argument) => {
        const { name, type, description } = argument
        return [
          colors.red(name),
          colors.yellow(type?.name ?? 'string'),
          colors.dim(description ?? '---'),
        ]
      })

      const optArgumentData = this.options.optionalArguments?.map<
        [CellValue, CellValue, CellValue]
      >((argument) => {
        const { name, type, description } = argument
        return [
          colors.blue(name),
          colors.yellow(type?.name ?? 'string') + '?',
          colors.dim(description ?? '---'),
        ]
      })

      CustomTable(
        [5, 3, 10],
        ...(argumentData ?? []),
        ...(optArgumentData ?? [])
      )
      console.log('')
    }

    if (this.options.listArgument) {
      const { name, type, minLength, maxLength } = this.options.listArgument
      console.log(colors.dim('List Argument: ' + colors.green(name)))
      console.log('', '----------------')

      console.log('', 'Argument Type  :', colors.yellow(type?.name ?? 'string'))

      minLength &&
        console.log(
          '',
          'Minimum length :',
          `Enter at least ${colors.yellow(String(minLength))} ${
            minLength < 2 ? 'item' : 'items'
          }`
        )

      maxLength != null &&
        console.log(
          '',
          'Maximum length :',
          `Enter upto ${colors.yellow(String(maxLength))} ${
            maxLength < 2 ? 'item' : 'items'
          }`
        )
      ;(!minLength || minLength < 1) &&
        console.log('', colors.black('Tips: You can also leave it empty'))

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

const NoArgConstructorSymbol = Symbol('NoArgConstructor')
const AliasRegexp = /^(\-)([^\-])/
const FlagRegexp = /^(\-\-)([^\-])/
const OptionWithValueRegexp = /^(?<key>[^\=]+)\=(?<value>.+)/
