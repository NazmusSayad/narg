import {
  Prettify,
  MergeObject,
  WritableObject,
  MakeObjectOptional,
} from '../types/util.t'
import {
  FlagOption,
  ArgumentsOptions,
  ListArgumentsOption,
  OptionalArgumentsOptions,
} from './types.t'
import colors from '../lib/colors'
import { CellValue } from 'cli-table3'
import { NoArgError } from './NoArgError'
import { NoArgParser } from './NoArgParser'
import ThrowExit from '../helpers/ThrowExit'
import { getArrayLengthStr } from '../utils'
import { NoArgCoreHelper } from './NoArgCore'
import { TypeArray } from '../schema/TypeArray'
import { TypeTuple } from '../schema/TypeTuple'
import { TypeString } from '../schema/TypeString'
import { TypeNumber } from '../schema/TypeNumber'
import { ExtractTypeOutput } from '../schema/type.t'
import { CustomTable } from '../helpers/custom-table'

export class NoArgProgram<
  TName extends string,
  TSystem extends NoArgCoreHelper.System,
  TConfig extends NoArgProgramHelper.Config,
  TOptions extends NoArgCoreHelper.Options
> extends NoArgParser<TName, TSystem, TConfig, TOptions> {
  protected parent?: NoArgProgram<any, any, any, any>

  constructor(
    name: TName,
    system: TSystem,
    config: TConfig,
    options: TOptions,
    parent?: NoArgProgram<any, any, any, any>
  ) {
    super(name, system, config, options)
    this.parent = parent
  }

  /**
   * Create a new NoArgProgramHelper instance
   * @param name The name of the program
   * @param options The options for the program
   * @returns A new NoArgProgramHelper instance
   * @example
   * const program = app.create('my-program', {
   *   ...
   * })
   *
   */
  public create<
    const TName extends string,
    const TCreateOptionsWithConfig extends Partial<NoArgCoreHelper.Options> & {
      config?: Partial<NoArgProgramHelper.Config>
    }
  >(name: TName, { config, ...options }: TCreateOptionsWithConfig) {
    type TInnerConfig = NonNullable<TCreateOptionsWithConfig['config']>
    type TInnerOptions = Omit<
      TCreateOptionsWithConfig,
      'config'
    > extends Partial<NoArgCoreHelper.Options>
      ? MergeObject<
          NoArgCoreHelper.DefaultOptions,
          Omit<TCreateOptionsWithConfig, 'config'>
        >
      : never

    type TInnerOptionsWithGlobalFlags =
      TInnerConfig['skipGlobalFlags'] extends true
        ? TInnerOptions
        : MergeObject<
            TInnerOptions,
            {
              globalFlags: Prettify<
                MergeObject<
                  TOptions['globalFlags'],
                  TInnerOptions['globalFlags']
                >
              >
            }
          >

    type TChildConfig = Prettify<Required<MergeObject<TConfig, TInnerConfig>>>
    type TChildOptions = Prettify<Required<TInnerOptionsWithGlobalFlags>>

    const newConfig = {
      ...this.config,
      ...config,
    } as unknown as TChildConfig

    const newOptions: TChildOptions = {
      ...NoArgCoreHelper.defaultOptions,
      ...{
        ...options,
        globalFlags: newConfig.skipGlobalFlags
          ? options.globalFlags ?? NoArgCoreHelper.defaultOptions.globalFlags
          : {
              ...this.options.globalFlags,
              ...options.globalFlags,
            },
      },
    } as unknown as TChildOptions

    const child = new NoArgProgram<TName, TSystem, TChildConfig, TChildOptions>(
      name,
      this.system,
      newConfig,
      newOptions as TChildOptions,
      this
    )

    this.programs.set(name, child as any)
    return child
  }

  protected onActionCallback?: NoArgExtract.ExtractAction<
    TSystem,
    TConfig,
    TOptions
  >

  /**
   * Set the action of the program
   * @example
   * program.on((args, flags, config, system) => {
   *  console.log(args)
   * })
   */
  public on(callback: NonNullable<typeof this.onActionCallback>) {
    this.onActionCallback = callback as any
    return this
  }

  protected async startCore(args: string[]) {
    try {
      const result = await this.parseStart(args)
      if (!result) return

      const output = [
        [
          ...result.args,
          ...result.optArgs,
          ...(this.options.listArgument ? [result.listArgs] : []),
          ...(this.options.trailingArguments ? [result.trailingArgs] : []),
        ],
        { ...result.flags },
        { ...this.config },
        { ...this.system },
      ] as Parameters<NonNullable<typeof this.onActionCallback>>

      this.onActionCallback?.(...output)
    } catch (error) {
      const canExit = !this.system.doNotExitOnError

      if (error instanceof ThrowExit) {
        if (error.message) {
          console.error(colors.red('Error:'), `${error.message}`)
        }

        if (!canExit) return
        return process.exit(error.code)
      }

      if (error instanceof NoArgError) {
        console.error(colors.red('Error:'), `${error.message}`)

        if (!canExit) return
        return process.exit(1)
      }

      throw error
    }
  }

  private colors = {
    type: colors.yellow,
    description: colors.reset,
    programs: colors.magenta,
    arguments: colors.blue,
    flags: colors.cyan,
    trailingArgs: colors.green,
    emptyString: colors.dim('┈'),
  }

  // HELP METHOD
  private renderHelpIntro() {
    console.log(
      colors.cyan.bold(this.name),
      this.options.description
        ? this.colors.description(this.options.description)
        : ''
    )
  }

  private renderHelpUsageIntro() {
    console.log(colors.bold('Usage:'))

    if (this.options.customRenderHelp?.helpUsageStructure) {
      return console.log(
        colors.cyan('$'),
        this.options.customRenderHelp?.helpUsageStructure
      )
    }

    const commandItems: string[] = [colors.dim(this.name)]

    ;(function getParent(current: NoArgProgram<any, any, any, any>) {
      if (!current.parent) return
      commandItems.unshift(current.parent.name)
      getParent(current.parent)
    })(this)

    if (this.programs.size) {
      commandItems.push(this.colors.programs('[' + 'program' + ']'))
    }

    this.options.arguments.forEach((argument) => {
      commandItems.push(this.colors.arguments(`<${argument.name}>`))
    })

    this.options.optionalArguments.forEach((argument) => {
      commandItems.push(this.colors.arguments(`<${argument.name}>`) + '?')
    })

    if (this.options.listArgument) {
      commandItems.push(
        this.colors.arguments('...[' + this.options.listArgument.name + ']')
      )
    }

    if (
      Object.keys(this.options.flags).length ||
      Object.keys(this.options.globalFlags).length
    ) {
      commandItems.push(this.colors.flags('--[flags]'))
    }

    if (this.options.trailingArguments) {
      commandItems.push(
        this.colors.description(this.options.trailingArguments),
        this.colors.description(
          this.options.customRenderHelp?.helpUsageTrailingArgsLabel ??
            `[...trailing-args]`
        )
      )
    }

    console.log([colors.cyan('$'), ...commandItems].filter(Boolean).join(' '))
  }

  private renderHelpPrograms() {
    console.log(colors.bold('Programs:'))

    const programData = Array.from(this.programs).map<[CellValue, CellValue]>(
      ([name, program]) => [
        this.colors.programs(name),
        this.colors.description(
          program.options.description ?? this.colors.emptyString
        ),
      ]
    )

    CustomTable(
      {
        sizes: [{ flex: 5, maxWidth: 20 }, { flex: 13 }],
        border: this.system.enableHelpBoxBorder,
      },
      ...programData
    )
  }

  private renderHelpArguments() {
    console.log(colors.bold('Arguments:'))
    const tables = [] as [CellValue, CellValue, CellValue][]

    this.options.arguments.forEach((argument) => {
      const { name, type } = argument
      tables.push([
        this.colors.arguments(name),
        this.colors.type(type.name),
        this.colors.description(
          argument.description ?? this.colors.emptyString
        ),
      ])
    })

    this.options.optionalArguments.forEach((argument) => {
      const { name, type } = argument
      tables.push([
        this.colors.arguments(name),
        this.colors.type(type.name) + '?',
        this.colors.description(
          argument.description ?? this.colors.emptyString
        ),
      ])
    })

    if (this.options.listArgument) {
      const { name, type, minLength, maxLength, description } =
        this.options.listArgument

      tables.push([
        this.colors.arguments(name),
        this.colors.type(type.name) +
          `[${getArrayLengthStr(minLength, maxLength)}]` +
          (minLength && minLength > 0 ? '' : '?'),

        this.colors.description(description ?? this.colors.emptyString),
      ])
    }

    CustomTable(
      {
        sizes: [
          { flex: 6, maxWidth: 20 },
          { flex: 5, maxWidth: 20 },
          { flex: 10 },
        ],
        border: this.system.enableHelpBoxBorder,
      },
      ...tables
    )
  }

  private renderHelpFlags(flags: FlagOption) {
    const optionData = Object.entries(flags)
      .sort(([keyA], [keyB]) => {
        if (keyA > keyB) return 1
        if (keyA < keyB) return -1
        return 0
      })
      .sort(([, aSchema], [, bSchema]) => {
        const aIsMust =
          aSchema.config.required &&
          aSchema.config.default === undefined &&
          aSchema.config.askQuestion === undefined

        const bIsMust =
          bSchema.config.required &&
          bSchema.config.default === undefined &&
          bSchema.config.askQuestion === undefined

        return aIsMust === bIsMust ? 0 : aIsMust ? -1 : 1
      })

      .map<[CellValue, CellValue, CellValue]>(([name, schema]) => {
        const aliasString = schema.config.aliases
          ? `-${schema.config.aliases
              .map((alias) => this.colors.flags(alias))
              .join('\n -')}`
          : ''

        const optionName =
          '--' +
          this.colors.flags(name) +
          (aliasString ? '\n ' + aliasString : '')

        const optionType =
          (schema instanceof TypeArray
            ? this.colors.type(schema.config.schema.name) +
              `[${getArrayLengthStr(
                schema.config.minLength,
                schema.config.maxLength
              )}]`
            : schema instanceof TypeTuple
            ? '[' +
              schema.config.schema
                .map((schema) => this.colors.type(schema.name))
                .join(', ') +
              ']'
            : this.colors.type(schema.name)) +
          (schema.config.required &&
          schema.config.default === undefined &&
          schema.config.askQuestion === undefined
            ? ''
            : '?')

        const enumValues =
          (schema instanceof TypeString || schema instanceof TypeNumber) &&
          schema.config.enum?.size
            ? colors.blue('\nChoices: ') +
              [...schema.config.enum.values()]
                .map((item) => colors.green(String(item)))
                .join(', ')
            : ''

        return [
          optionName,
          optionType,
          this.colors.description(
            ((schema.config.description ?? '') + enumValues).trim() ||
              this.colors.emptyString
          ),
        ]
      })

    CustomTable(
      {
        sizes: [
          { flex: 6, maxWidth: 20 },
          { flex: 5, maxWidth: 20 },
          { flex: 10 },
        ],
        border: this.system.enableHelpBoxBorder,
      },
      ...optionData
    )
  }

  /**
   * Render the help of the program
   * @example
   * program.renderHelp()
   */
  public renderHelp() {
    this.renderHelpIntro()
    console.log('')

    this.renderHelpUsageIntro()
    console.log('')

    if (this.programs.size) {
      this.renderHelpPrograms()
      console.log('')
    }

    if (
      this.options.arguments.length ||
      this.options.optionalArguments.length ||
      this.options.listArgument
    ) {
      this.renderHelpArguments()
      console.log('')
    }

    const hasFlags = Object.keys(this.options.flags).length
    const hasGlobalFlags = Object.keys(this.options.globalFlags).length

    if (hasFlags || hasGlobalFlags) {
      console.log(colors.bold('Flags:'))

      hasFlags && this.renderHelpFlags(this.options.flags)
      hasGlobalFlags && this.renderHelpFlags(this.options.globalFlags)

      console.log('')
    }

    if (this.options.trailingArguments) {
      console.log(colors.bold('Trailing Arguments:'))

      console.log(
        ` These arguments are ${colors.red(
          'ignored'
        )} by the program and are passed as is.`
      )

      console.log('')
    }

    if (this.options.notes?.length) {
      console.log(colors.bold('Notes:'))
      this.options.notes.forEach((note) => {
        console.log(' -', colors.dim(note))
      })

      console.log('')
    }

    if (this.config.help) {
      console.log(colors.bold('Tips:'))
      console.log(
        ' Use',
        colors.yellow('--help-usage'),
        'or',
        colors.yellow('-hu'),
        'flag to see how to use the program'
      )
    }
  }

  private renderUsageUtils = {
    printValid(...args: string[]) {
      console.log('  ', colors.green('✔   ' + args.join(' ')))
    },

    printInvalid(...args: string[]) {
      console.log('  ', colors.red('✖   ' + args.join(' ')))
    },

    printGroupHeader(...args: string[]) {
      console.log(' ⚙︎', colors.dim(args.join(' ')))
    },

    printPointHeader(...args: string[]) {
      console.log('   -', colors.dim(args.join(' ')))
    },

    tableGroup(name: string, result: string, ...args: string[]) {
      return [name, args.join('\n'), result] as any
    },
  }

  private renderUsageStructure() {
    console.log(
      colors.green('$'),
      this.colors.programs('programs'),
      this.colors.arguments('fixed-arguments'),
      this.colors.arguments('optional-arguments'),
      this.colors.arguments('list-arguments'),
      this.colors.flags('flags'),
      this.colors.trailingArgs('trailing-args')
    )

    console.log(
      '',
      "This is the structure of the command line. It's the order of the arguments and options that you want to pass to the command. The order is important and can't be changed."
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(this.colors.programs('programs'))
    console.log(
      '',
      "This is the command that you want to run. It's the first argument of the command line."
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(
      this.colors.arguments('fixed-arguments')
    )
    console.log(
      '',
      "These are the arguments that you want to pass to the command. Their position and length is fixed and can't be changed."
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(
      this.colors.arguments('optional-arguments')
    )
    console.log(
      '',
      'These are the arguments that you want to pass to the command. They are optional and can be changed.'
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(
      this.colors.arguments('list-arguments')
    )
    console.log(
      '',
      'These are the arguments that you want to pass to the command. They are list of values and length can vary on configuration. They also can be optional.'
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(this.colors.flags('flags'))
    console.log(
      '',
      'These are the options that you want to pass to the command. They are optional and can be changed.'
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(
      this.colors.trailingArgs('trailing-args')
    )
    console.log(
      '',
      'These are the arguments that are passed to the command after the trailing-args separator. They are passed as is and are ignored by the program.'
    )
  }

  private renderUsageHowToUseOptions() {
    CustomTable(
      {
        sizes: [
          { flex: 1, minWidth: 8, maxWidth: 20 },
          { flex: 3, maxWidth: 40 },
          { flex: 2, maxWidth: 40 },
        ],
        border: this.system.enableHelpBoxBorder,
      },
      this.renderUsageUtils.tableGroup(
        'string',
        'string',
        '--string string',
        '--string=string'
      ),

      this.renderUsageUtils.tableGroup(
        'number',
        '100',
        '--number 100',
        '--number=100'
      ),

      this.renderUsageUtils.tableGroup(
        'boolean\n(true)',
        'true',
        '--boolean',
        '--boolean true',
        '--boolean=true',
        '--boolean yes',
        '--boolean=yes',
        colors.dim("* Casing doesn't matter"),
        '--boolean YeS'
      ),

      this.renderUsageUtils.tableGroup(
        'boolean\n(false)',
        'false',
        '--boolean' + this.system.booleanNotSyntaxEnding,
        '--boolean false',
        '--boolean=false',
        '--boolean no',
        '--boolean=no',
        colors.dim("* Casing doesn't matter"),
        '--boolean fAlSe'
      ),

      this.renderUsageUtils.tableGroup(
        'array\ntuple',
        "['value1', 'value2']",
        '--option value1 value2',
        '--option=value1 value2'
      )
    )
  }

  private renderUsageProgramConfiguration() {
    if (this.config.help) {
      this.renderUsageUtils.printGroupHeader('Auto Help flag is enabled')
      this.renderUsageUtils.printValid(colors.yellow('--help'))
      this.renderUsageUtils.printValid(colors.yellow('--help-usage'))
      this.renderUsageUtils.printValid(colors.yellow('-h'))
      this.renderUsageUtils.printValid(colors.yellow('-hu'))
    } else {
      this.renderUsageUtils.printGroupHeader('Auto Help flag is disabled')
      this.renderUsageUtils.printInvalid(colors.yellow('--help'))
      this.renderUsageUtils.printInvalid(colors.yellow('--help-usage'))
      this.renderUsageUtils.printInvalid(colors.yellow('-h'))
      this.renderUsageUtils.printInvalid(colors.yellow('-hu'))
    }
  }

  private renderUsageSystemConfiguration() {
    if (this.system.allowEqualAssign) {
      this.renderUsageUtils.printGroupHeader(
        'Options with equal value is enabled'
      )
      this.renderUsageUtils.printValid(colors.yellow('--option'), 'value')
      this.renderUsageUtils.printValid(
        colors.yellow('--option') + colors.blue('=') + 'value'
      )
    } else {
      this.renderUsageUtils.printGroupHeader(
        'Options with equal value is disabled'
      )
      this.renderUsageUtils.printValid(colors.yellow('--option'), 'value')
      this.renderUsageUtils.printInvalid(
        colors.yellow('--option') + colors.blue('=') + 'value'
      )
    }

    if (this.system.booleanNotSyntaxEnding) {
      this.renderUsageUtils.printGroupHeader(
        'Boolean not syntax ending is enabled'
      )

      this.renderUsageUtils.printValid(colors.yellow('--option'))
      this.renderUsageUtils.printValid(
        colors.yellow('--option' + this.system.booleanNotSyntaxEnding)
      )
    } else {
      this.renderUsageUtils.printGroupHeader(
        'Boolean not syntax ending is disabled'
      )

      this.renderUsageUtils.printValid(colors.yellow('--option'))
      this.renderUsageUtils.printInvalid(
        colors.red('--option' + this.system.booleanNotSyntaxEnding)
      )
    }

    if (this.system.allowDuplicateFlagForPrimitive) {
      this.renderUsageUtils.printGroupHeader(
        'Duplicate flags for primitive is enabled'
      )
      this.renderUsageUtils.printValid(
        colors.yellow('--option'),
        colors.dim('value1')
      )
      this.renderUsageUtils.printValid(
        colors.yellow('--option'),
        colors.dim('value1'),
        colors.yellow('--option'),
        'value2'
      )
    } else {
      this.renderUsageUtils.printGroupHeader(
        'Duplicate flags for primitive is disabled'
      )
      this.renderUsageUtils.printValid(colors.yellow('--option'), 'value')
      this.renderUsageUtils.printInvalid(
        colors.yellow('--option'),
        'value1',
        colors.yellow('--option'),
        'value2'
      )
    }

    if (this.system.allowDuplicateFlagForList) {
      this.renderUsageUtils.printGroupHeader(
        'Duplicate flags for list is enabled'
      )
      this.renderUsageUtils.printValid(
        colors.yellow('--option'),
        'value1 value2',
        colors.yellow('--option'),
        'value3'
      )
      this.renderUsageUtils.printValid(
        colors.yellow('--option'),
        'value1',
        colors.yellow('--option'),
        'value2 value3'
      )

      if (this.system.overwriteDuplicateFlagForList) {
        this.renderUsageUtils.printGroupHeader(
          'Overwrite duplicate flags for list is enabled'
        )

        this.renderUsageUtils.printValid(
          colors.yellow('--option'),
          colors.dim('value1'),
          colors.yellow('--option'),
          'value2 value3'
        )
        this.renderUsageUtils.printValid(
          colors.yellow('--option'),
          colors.dim('value1 value2'),
          colors.yellow('--option'),
          'value3'
        )
      } else {
        this.renderUsageUtils.printGroupHeader(
          'Overwrite duplicate flags for list is disabled'
        )

        this.renderUsageUtils.printValid(
          colors.yellow('--option'),
          'value1 value2 value3'
        )
        this.renderUsageUtils.printValid(
          colors.yellow('--option'),
          'value1',
          colors.yellow('--option'),
          'value2'
        )
      }
    } else {
      this.renderUsageUtils.printGroupHeader(
        'Duplicate flags for list is disabled'
      )

      this.renderUsageUtils.printValid(
        colors.yellow('--option'),
        'value1 value2 value3'
      )
      this.renderUsageUtils.printInvalid(
        colors.yellow('--option'),
        'value1',
        colors.yellow('--option'),
        'value2'
      )
    }
  }

  /**
   * Render the usage of the program
   * @example
   * program.renderUsage()
   */
  public renderUsage() {
    console.log(colors.bold(colors.cyan('📝 Structure:')))
    this.renderUsageStructure()
    console.log('')

    console.log(colors.bold(colors.cyan('📝 How to use flags:')))
    this.renderUsageHowToUseOptions()
    console.log('')

    console.log(colors.bold(colors.cyan('📝 Program Configuration:')))
    this.renderUsageProgramConfiguration()
    console.log('')

    console.log(colors.bold(colors.cyan('📝 System Configuration:')))
    this.renderUsageSystemConfiguration()
    console.log('')
  }
}

export namespace NoArgProgramHelper {
  export type Config = NoArgCoreHelper.Config & {
    readonly skipGlobalFlags?: boolean
  }
}

export namespace NoArgExtract {
  export type ExtractArguments<T extends ArgumentsOptions[]> = {
    [K in keyof T]: ExtractTypeOutput<T[K]['type']>
  }

  export type ExtractOptionalArguments<T extends OptionalArgumentsOptions[]> = {
    [K in keyof ExtractArguments<T>]: ExtractArguments<T>[K] | undefined
  }

  export type ExtractListArgument<T extends ListArgumentsOption> =
    ExtractTypeOutput<T['type']>[]

  export type ExtractFlags<T extends FlagOption> = Prettify<
    MakeObjectOptional<
      WritableObject<{
        [K in keyof T]:
          | ExtractTypeOutput<T[K]>
          | (T[K]['config']['required'] extends true ? never : undefined)
      }>
    >
  >

  export type ExtractCombinedArgs<TOptions extends NoArgCoreHelper.Options> = [
    ...ExtractArguments<NonNullable<TOptions['arguments']>>,
    ...ExtractOptionalArguments<NonNullable<TOptions['optionalArguments']>>,
    ...(TOptions['listArgument'] extends {}
      ? [
          ListArguments: Prettify<
            ExtractListArgument<NonNullable<TOptions['listArgument']>>
          >
        ]
      : []),
    ...(TOptions['trailingArguments'] extends NonNullable<
      NoArgCoreHelper.Options['trailingArguments']
    >
      ? TOptions['trailingArguments'] extends ''
        ? []
        : [TrailingArguments: string[]]
      : [])
  ]

  export type ExtractCombinedFlags<TOptions extends NoArgCoreHelper.Options> =
    Prettify<
      MakeObjectOptional<
        ExtractFlags<
          MergeObject<
            NonNullable<TOptions['globalFlags']>,
            NonNullable<TOptions['flags']>
          >
        >
      >
    >

  export type ExtractAction<
    TSystem extends NoArgCoreHelper.System,
    TConfig extends NoArgProgramHelper.Config,
    TOptions extends NoArgCoreHelper.Options
  > = (
    args: ExtractCombinedArgs<TOptions>,
    flags: ExtractCombinedFlags<TOptions>,
    config: TConfig,
    system: TSystem
  ) => void
}
