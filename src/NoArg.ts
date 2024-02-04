import colors from './lib/colors'
import { getFlagInfo } from './utils'
import { CellValue } from 'cli-table3'
import { NoArgError } from './lib/extra'
import { CustomTable } from './lib/table'
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

  private parsePrograms([name, ...args]: string[]) {
    if (!this.config.programs) return false

    if (Object.keys(this.config.programs).length === 0) return false
    const program = Object.getOwnPropertyDescriptor(this.config.programs, name)
    if (!program) return false

    this.config.programs[name].run(args)
    return true
  }

  private divideArguments(args: string[]) {
    const argList: string[] = []
    const optionList: string[] = []
    let isOptionReached = false

    for (let arg of args) {
      const result = getFlagInfo(arg)
      if (!isOptionReached && result.isOption) {
        isOptionReached = true
      }

      if (!isOptionReached) {
        argList.push(arg)
        continue
      }

      if (!this.config.disableEqualValue && result.hasValue) {
        optionList.push(...result.splitted)
      } else {
        optionList.push(arg)
      }
    }

    return [argList, optionList]
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

  private parseArgForFlag(arg: string) {
    const { isFlag, isAlias } = getFlagInfo(arg)

    if (isFlag) return arg.slice(2)
    if (isAlias) {
      const name = arg.slice(1)
      if (!this.config.options) return null

      for (let key in this.config.options) {
        if (this.config.options[key].config.aliases?.includes(name)) return key
      }

      return null
    }
  }

  private parseOptions(args: string[]) {
    const output: Record<string, any> = {}
    let currentOption: { raw: string; key: string }
    const listQueue: string[] = []

    const getCurrentSchema = () => {
      const schema =
        currentOption &&
        this.config.options &&
        this.config.options[currentOption.key]

      if (!schema) {
        if (currentOption) {
          throw new NoArgError(
            `Unknown option ${colors.yellow(currentOption.raw)}`
          )
        }

        throw new Error('Something went wrong!, currentOption is falsy')
      }

      return schema
    }

    const compileList = () => {
      if (!currentOption) return
      const schema = getCurrentSchema()

      if (schema instanceof TypeArray || schema instanceof TypeTuple) {
        const [data, error, ok] = schema.parseWithDefault(listQueue)
        if (!ok) {
          throw new NoArgError(
            `${error} for option: ${colors.cyan(currentOption.raw)}`
          )
        }

        output[currentOption.key] = data
        listQueue.length = 0
      }

      if (currentOption && output[currentOption.key] === undefined) {
        if (schema instanceof TypeBoolean) {
          output[currentOption.key] = true
          return
        }

        throw new NoArgError(
          `No value given for option: ${colors.red(currentOption.raw)}`
        )
      }
    }

    for (let arg of args) {
      const newFlagName = this.parseArgForFlag(arg)

      if (newFlagName) {
        if (newFlagName in output || currentOption!?.key === newFlagName) {
          throw new NoArgError(`Duplicate option ${colors.cyan(arg)} entered`)
        }

        compileList()
        currentOption = { raw: arg, key: newFlagName }
        continue
      }

      const schema = getCurrentSchema()

      const isEscapeArg = /^(\\+)--?[^-]/.test(arg)
      if (isEscapeArg) {
        arg = arg.slice(1)
      }

      if (schema instanceof TypeArray || schema instanceof TypeTuple) {
        listQueue.push(arg)
        continue
      }

      const [data, error, ok] = schema.parseWithDefault(arg)
      if (!ok)
        throw new NoArgError(`${error} for: ${colors.cyan(currentOption!.raw)}`)

      if (currentOption!.key in output) {
        throw new NoArgError(
          `Duplicate value ${colors.green(arg)} for option ${colors.cyan(
            currentOption!.raw
          )}`
        )
      }

      output[currentOption!.key] = data
    }

    compileList()

    for (let name in this.config.options) {
      const schema = this.config.options[name]
      const canBeUsed = schema.config.required || schema.config.default
      if (canBeUsed && output[name] === undefined) {
        const [data, _, ok] = schema.parseWithDefault()

        if (!ok) {
          throw new NoArgError(
            `Required option --${colors.red(name)} not given`
          )
        }

        output[name] = data
      }
    }

    return output
  }

  private renderHelp() {
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

  private runCore(args: string[]) {
    const [argsList, flagsList] = this.divideArguments(args)
    if (this.parsePrograms([...argsList, ...flagsList])) return

    const hasHelp = args.find((arg) => {
      const info = getFlagInfo(arg)
      return (
        info.isOption && (info.name.match('-h') || info.name.match('--help'))
      )
    })

    if (hasHelp && !this.config.disableHelp) {
      this.renderHelp()
      return process.exit(0)
    }

    const resultArguments = this.parseArguments(argsList)
    const resultOptions = this.parseOptions(flagsList)
    const output = [resultArguments, resultOptions, this.config] as Parameters<
      Action<TConfig>
    >

    this.action(...output)
    return output
  }
}
