import colors from './lib/colors'
import { getFlagInfo } from './utils'
import { CellValue } from 'cli-table3'
import { CustomTable } from './lib/table'
import { Action, Config, MixConfig } from './config'
import { TypeBoolean, TypeArray, TypeTuple } from './schemaType/index'

class ProgramError extends Error {
  constructor(messages: string) {
    super(messages)
  }
}

export default class Program<
  TName extends Lowercase<string>,
  const TConfig extends Config
> {
  constructor(
    public name: TName,
    public config: TConfig,
    public action: Action<TConfig>
  ) {
    this.config.options = {
      help: new TypeBoolean({
        global: true,
        required: false,
        aliases: ['h'],
        default: false,
        description: 'Show help',
      }),

      ...this.config.options,
    }
  }
  
  

  private parsePrograms([name, ...args]: string[]) {
    this.config.programs ??= {}

    if (Object.keys(this.config.programs).length === 0) return false
    const program = Object.getOwnPropertyDescriptor(this.config.programs, name)
    if (!program) return false

    this.config.programs[name].run(args)
    return true
  }

  private divideArguments(args: string[]) {
    const argList: string[] = []
    const optionList: string[] = []
    let isOptionLevel = false

    for (let arg of args) {
      const result = getFlagInfo(arg)
      if (!isOptionLevel && result.isOption) {
        isOptionLevel = true
      }

      if (!isOptionLevel) {
        argList.push(arg)
        continue
      }

      if (result.hasValue) {
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
        .map(({ name }) => name)
        .join("', '")

      throw new ProgramError(
        `Expected ${neededArgsCount} arguments, missing: [${missingArgsCount}] '${remainingArgs}'`
      )
    }

    const result = this.config.arguments.map((config, i) => {
      const input = duplicateArgs.shift()!
      if (!config.type) return input
      const [data, error] = config.type.parse(input)
      if (error) {
        throw new ProgramError(`${error} for argument: ${config.name}`)
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
        throw new ProgramError(
          `${error} for list argument: ${this.config.listArgument.name}`
        )
      }
    }

    return [...result, ...listResult]
  }

  private parseArgForFlag(arg: string) {
    const { isFlag, isAlias } = getFlagInfo(arg)

    return isFlag
      ? arg.slice(2)
      : isAlias
      ? Object.entries(this.config.options ?? {}).find(([, options]) => {
          return options.config.aliases?.includes(arg.slice(1))
        })?.[0]
      : undefined
  }

  private parseOptions(args: string[]) {
    const output: Record<string, any> = {}
    let currentOption: { raw: string; key: string } | undefined = undefined
    const listQueue: string[] = []

    const getCurrentSchema = () => {
      return (
        currentOption &&
        this.config.options &&
        this.config.options[currentOption.key]
      )
    }

    const workForList = () => {
      const schema = getCurrentSchema()

      if (schema instanceof TypeArray || schema instanceof TypeTuple) {
        const currOption = currentOption!
        const [data, error, ok] = schema.parseWithDefault(listQueue)
        if (!ok) {
          throw new ProgramError(`${error} for option: '${currOption.raw}'`)
        }

        output[currOption.key] = data
        listQueue.length = 0
      }

      if (currentOption && output[currentOption.key] === undefined) {
        if (schema instanceof TypeBoolean) {
          output[currentOption.key] = true
          return
        }

        throw new ProgramError(
          `No input given for option: '${currentOption.raw}'`
        )
      }
    }

    for (let arg of args) {
      const newFlagName = this.parseArgForFlag(arg)
      if (newFlagName) {
        workForList()
        currentOption = { raw: arg, key: newFlagName }
        continue
      }

      const schema = getCurrentSchema()!
      const currOption = currentOption!
      if (!schema) throw new ProgramError(`Unknown option '${currOption.raw}'`)

      if (schema instanceof TypeArray || schema instanceof TypeTuple) {
        listQueue.push(arg)
        continue
      } else {
      }

      const [data, error, ok] = schema.parseWithDefault(arg)
      if (!ok) throw new ProgramError(`${error} for: '${currOption.raw}'`)

      if (output[currOption.key]) {
        throw new ProgramError(
          `Duplicate input "${arg}" for option '${currOption.raw}'`
        )
      }

      output[currOption.key] = data
    }

    workForList()

    for (let name in this.config.options) {
      const schema = this.config.options[name]
      const canBeUsed = schema.config.required || schema.config.default
      if (canBeUsed && output[name] === undefined) {
        const [data, _, ok] = schema.parseWithDefault()

        if (!ok) {
          throw new ProgramError(`Required option '--${name}' not given`)
        }

        output[name] = data
      }
    }

    return output
  }

  private renderHelp() {
    {
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
            colors.dim(program.config.description ?? '---'),
          ]
        }
      )

      const table = CustomTable([1, 2], ...programData)
      console.log(table.toString())
      console.log('')
    }

    if (this.config.arguments) {
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

      const table = CustomTable([2, 1, 5], ...argumentData)
      console.log(table.toString())
      console.log('')
    }

    if (this.config.options) {
      console.log(colors.dim('Options:'))

      const optionData = Object.entries(this.config.options).map<
        [CellValue, CellValue, CellValue]
      >(([name, schema]) => {
        const schemaConfig = schema.config

        const aliasString = schemaConfig.aliases
          ? `-${schemaConfig.aliases
              .map((alias) => colors.cyan(alias))
              .join('\n -')}`
          : ''

        const optionName =
          '--' +
          colors.blueBright(name) +
          (aliasString ? '\n ' + aliasString : '')

        const optionType =
          schemaConfig.required && !('default' in schema.config)
            ? colors.red(schema.name)
            : colors.yellow(schema.name)

        return [
          optionName,
          optionType,
          colors.dim(schemaConfig.description ?? '---'),
        ]
      })

      const table = CustomTable([2, 1, 5], ...optionData)
      console.log(table.toString())
      console.log('')
    }
  }

  private runCore(args: string[]) {
    const [argsList, flagsList] = this.divideArguments(args)
    if (this.parsePrograms([...argsList, ...flagsList])) return

    const hasHelp = args.find((arg) => {
      const info = getFlagInfo(arg)
      return (
        info.isOption &&
        (info.name.toLowerCase().match('-h') ||
          info.name.toLowerCase().match('--help'))
      )
    })

    if (hasHelp && !this.config.disableHelp) {
      return this.renderHelp()
    }

    const resultArguments = this.parseArguments(argsList)
    const resultOptions = this.parseOptions(flagsList)

    return this.action(
      resultArguments as any,
      resultOptions as any,
      this.config
    )
  }

  public run(args: string[] = process.argv.slice(2)) {
    try {
      this.runCore(args)
    } catch (error) {
      if (error instanceof ProgramError) {
        console.error(colors.red('Error:'), `${error.message}`)
        process.exit(1)
      } else {
        console.error({ error })
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

    const program = new Program<TNewName, TMixConfig>(
      name,
      {
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
}
