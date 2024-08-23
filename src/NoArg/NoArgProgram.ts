import {
  FlagOption,
  ArgumentsOptions,
  ListArgumentsOption,
  OptionalArgumentsOptions,
} from './types.t'
import colors from '../lib/colors'
import { CellValue } from 'cli-table3'
import { NoArgCore } from './NoArgCore'
import { NoArgError } from './NoArgError'
import { NoArgParser } from './NoArgParser'
import { TypeArray } from '../schema/TypeArray'
import { TypeTuple } from '../schema/TypeTuple'
import { ExtractTypeOutput } from '../schema/type.t'
import { CustomTable } from '../helpers/custom-table'
import { Prettify, MergeObject, MakeObjectOptional } from '../types/util.t'

export class NoArgProgram<
  TName extends string,
  TSystem extends NoArgCore.System,
  TConfig extends NoArgProgram.Config,
  TOptions extends NoArgCore.Options
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
   * Create a new NoArgProgram instance
   * @param name The name of the program
   * @param options The options for the program
   * @returns A new NoArgProgram instance
   * @example
   * const program = app.create('my-program', {
   *   ...
   * })
   *
   */
  public create<
    const TName extends string,
    const TCreateOptionsWithConfig extends Partial<NoArgCore.Options> & {
      config?: Partial<NoArgProgram.Config>
    }
  >(name: TName, { config, ...options }: TCreateOptionsWithConfig) {
    type TInnerConfig = NonNullable<TCreateOptionsWithConfig['config']>
    type TInnerOptions = Omit<
      TCreateOptionsWithConfig,
      'config'
    > extends Partial<NoArgCore.Options>
      ? MergeObject<
          NoArgCore.DefaultOptions,
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

    const optionsWithDefault = {
      ...NoArgCore.defaultOptions,
      ...options,
    } as unknown as TChildOptions

    if (!newConfig.skipGlobalFlags) {
      optionsWithDefault.globalFlags = {
        ...this.options.globalFlags,
        ...(optionsWithDefault.globalFlags as any),
      }
    }

    const child = new NoArgProgram<TName, TSystem, TChildConfig, TChildOptions>(
      name,
      this.system,
      newConfig,
      optionsWithDefault,
      this
    )

    this.programs.set(name, child as any)
    return child
  }

  protected onActionCallback?: NoArgProgram.ExtractAction<
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
          ...(this.config.enableTrailingArgs ? [result.trailingArgs] : []),
        ],
        result.flags,
        this.config,
        this.system,
      ] as Parameters<NonNullable<typeof this.onActionCallback>>

      this.onActionCallback?.(...output)
    } catch (error) {
      if (error instanceof NoArgError) {
        console.error(colors.red('Error:'), `${error.message}`)
        process.exit(1)
      } else throw error
    }
  }

  private helpColors = {
    type: colors.yellow,
    description: colors.reset,
    programs: colors.red,
    arguments: colors.blue,
    flags: colors.cyan,
    trailingArgs: colors.green,
    emptyString: colors.dim('---'),
  }

  // HELP METHOD
  private renderHelpOverview() {
    const commandItems: string[] = [colors.dim(this.name)]

    ;(function getParent(current: NoArgProgram<any, any, any, any>) {
      if (!current.parent) return
      commandItems.unshift(current.parent.name)
      getParent(current.parent)
    })(this)

    if (this.programs.size) {
      commandItems.push(this.helpColors.programs(`(program)`))
    }

    this.options.arguments.forEach((argument) => {
      commandItems.push(this.helpColors.arguments(`<${argument.name}>`))
    })

    this.options.optionalArguments.forEach((argument) => {
      commandItems.push(this.helpColors.arguments(`<${argument.name}>`) + '?')
    })

    if (this.options.listArgument) {
      commandItems.push(
        this.helpColors.arguments('[...' + this.options.listArgument.name + ']')
      )
    }

    if (
      Object.keys(this.options.flags).length ||
      Object.keys(this.options.globalFlags).length
    ) {
      commandItems.push(this.helpColors.flags('--[flags]'))
    }

    if (this.config.enableTrailingArgs) {
      commandItems.push(
        this.helpColors.description(this.config.trailingArgsSeparator),
        this.helpColors.description('[...trailing-args]')
      )
    }

    console.log(
      colors.cyan.bold(this.name),
      this.options.description
        ? this.helpColors.description(this.options.description)
        : ''
    )

    console.log('')
    console.log(colors.bold('Usage:'))
    console.log('')
    console.log([colors.cyan('$'), ...commandItems].filter(Boolean).join(' '))
  }

  private renderHelpPrograms() {
    console.log(colors.bold('Programs:'))

    const programData = Array.from(this.programs).map<[CellValue, CellValue]>(
      ([name, program]) => [
        this.helpColors.programs(name),
        this.helpColors.description(
          program.options.description ?? this.helpColors.emptyString
        ),
      ]
    )

    CustomTable([5, 13], ...programData)
  }

  private renderHelpArguments() {
    console.log(colors.bold('Arguments:'))
    const tables = [] as [CellValue, CellValue, CellValue][]

    this.options.arguments.forEach((argument) => {
      const { name, type } = argument
      tables.push([
        this.helpColors.arguments(name),
        this.helpColors.type(type.name),
        this.helpColors.description(
          argument.description ?? this.helpColors.emptyString
        ),
      ])
    })

    this.options.optionalArguments.forEach((argument) => {
      const { name, type } = argument
      tables.push([
        this.helpColors.arguments(name),
        this.helpColors.type(type.name) + '?',
        this.helpColors.description(
          argument.description ?? this.helpColors.emptyString
        ),
      ])
    })

    if (this.options.listArgument) {
      const { name, type, minLength, maxLength, description } =
        this.options.listArgument

      const hasMinLength = minLength !== undefined
      const hasMaxLength = maxLength !== undefined
      let nameSuffix = this.options.listArgument.minLength ? '' : '?'

      if (hasMinLength || hasMaxLength) {
        nameSuffix += '\n'

        if (hasMinLength) {
          nameSuffix += 'Min: ' + colors.yellow(String(minLength))
        }

        nameSuffix += '\n'

        if (hasMaxLength) {
          nameSuffix += 'Max: ' + colors.yellow(String(maxLength))
        }
      }

      tables.push([
        this.helpColors.arguments(name),
        this.helpColors.type(type.name) + '[]' + nameSuffix,
        this.helpColors.description(description ?? this.helpColors.emptyString),
      ])
    }

    CustomTable([5, 3, 10], ...tables)
  }

  private renderHelpFlags(flags: FlagOption) {
    const optionData = Object.entries(flags)
      .sort(([keyA], [keyB]) => {
        if (keyA > keyB) return 1
        if (keyA < keyB) return -1
        return 0
      })
      .sort(([, a]) => {
        const isRequired = a.config.required
        const hasDefault =
          a.config.default !== undefined || a.config.askQuestion !== undefined

        if (isRequired && !hasDefault) return -3
        if (isRequired && hasDefault) return -2
        return 1
      })

      .map<[CellValue, CellValue, CellValue]>(([name, schema]) => {
        const aliasString = schema.config.aliases
          ? `-${schema.config.aliases
              .map((alias) => this.helpColors.flags(alias))
              .join('\n -')}`
          : ''

        const optionName =
          '--' +
          this.helpColors.flags(name) +
          (aliasString ? '\n ' + aliasString : '')

        const optionType =
          (schema instanceof TypeArray
            ? this.helpColors.type(schema.name) +
              '[' +
              this.helpColors.type(schema.config.schema.name) +
              ']'
            : schema instanceof TypeTuple
            ? '[' +
              schema.config.schema
                .map((schema) => this.helpColors.type(schema.name))
                .join(', ') +
              ']'
            : this.helpColors.type(schema.name)) +
          (schema.config.required
            ? schema.config.default !== undefined ||
              schema.config.askQuestion !== undefined
              ? '?'
              : ''
            : '?')

        return [
          optionName,
          optionType,
          this.helpColors.description(
            schema.config.description ?? this.helpColors.emptyString
          ),
        ]
      })

    CustomTable([6, 5, 10], ...optionData)
  }

  /**
   * Render the help of the program
   * @example
   * program.renderHelp()
   */
  public renderHelp() {
    this.renderHelpOverview()
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

    if (this.config.enableTrailingArgs) {
      console.log(colors.bold('Trailing Arguments:'))

      console.log(
        ` These arguments are ${colors.red(
          'ignored'
        )} by the program and are passed as is.`
      )

      console.log('')
    }

    if (!this.config.help) {
      console.log(colors.bold('Tips:'))
      console.log(
        ' Use',
        colors.yellow('--help-usage'),
        'or',
        colors.yellow('-hu'),
        'flag to see how to use the program'
      )

      console.log('')
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
      console.log(' ⚙︎', colors.black(args.join(' ')))
    },

    printPointHeader(...args: string[]) {
      console.log('   -', colors.black(args.join(' ')))
    },

    tableGroup(name: string, result: string, ...args: string[]) {
      return [name, args.join('\n'), result] as any
    },
  }

  private renderUsageStructure() {
    console.log(
      colors.green('$'),
      this.helpColors.programs('programs'),
      this.helpColors.arguments('fixed-arguments'),
      this.helpColors.arguments('optional-arguments'),
      this.helpColors.arguments('list-arguments'),
      this.helpColors.flags('flags'),
      this.helpColors.trailingArgs('trailing-args')
    )

    console.log(
      '',
      "This is the structure of the command line. It's the order of the arguments and options that you want to pass to the command. The order is important and can't be changed."
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(this.helpColors.programs('programs'))
    console.log(
      '',
      "This is the command that you want to run. It's the first argument of the command line."
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(
      this.helpColors.arguments('fixed-arguments')
    )
    console.log(
      '',
      "These are the arguments that you want to pass to the command. Their position and length is fixed and can't be changed."
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(
      this.helpColors.arguments('optional-arguments')
    )
    console.log(
      '',
      'These are the arguments that you want to pass to the command. They are optional and can be changed.'
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(
      this.helpColors.arguments('list-arguments')
    )
    console.log(
      '',
      'These are the arguments that you want to pass to the command. They are list of values and length can vary on configuration. They also can be optional.'
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(this.helpColors.flags('flags'))
    console.log(
      '',
      'These are the options that you want to pass to the command. They are optional and can be changed.'
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(
      this.helpColors.trailingArgs('trailing-args')
    )
    console.log(
      '',
      'These are the arguments that are passed to the command after the trailing-args separator. They are passed as is and are ignored by the program.',
      colors.yellow(this.config.trailingArgsSeparator)
    )
  }

  private renderUsageHowToUseOptions() {
    CustomTable(
      [1, 3, 2],
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
        colors.black("* Casing doesn't matter"),
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
        colors.black("* Casing doesn't matter"),
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
    if (this.config.enableTrailingArgs) {
      this.renderUsageUtils.printGroupHeader('Trailing Arguments is enabled')
      this.renderUsageUtils.printValid(colors.yellow('--option'), 'value')
      this.renderUsageUtils.printValid(
        colors.yellow('--option'),
        'value',
        colors.yellow(this.config.trailingArgsSeparator),
        'trailing-args'
      )
    } else {
      this.renderUsageUtils.printGroupHeader('Trailing Arguments is disabled')
      this.renderUsageUtils.printValid(colors.yellow('--option'), 'value')
      this.renderUsageUtils.printInvalid(
        colors.yellow('--option'),
        'value',
        colors.red(this.config.trailingArgsSeparator),
        colors.red('trailing-args')
      )
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
        colors.black('value1'),
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
          colors.black('value1'),
          colors.yellow('--option'),
          'value2 value3'
        )
        this.renderUsageUtils.printValid(
          colors.yellow('--option'),
          colors.black('value1 value2'),
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

export module NoArgProgram {
  export type Config = NoArgCore.Config & {
    skipGlobalFlags?: boolean
  }

  export type ExtractArguments<T extends ArgumentsOptions[]> = {
    [K in keyof T]: ExtractTypeOutput<T[K]['type']>
  }

  export type ExtractOptionalArguments<T extends OptionalArgumentsOptions[]> =
    Partial<ExtractArguments<T>>

  export type ExtractListArgument<T extends ListArgumentsOption> =
    ExtractTypeOutput<T['type']>[]

  export type ExtractFlags<T extends FlagOption> = {
    [K in keyof T]:
      | ExtractTypeOutput<T[K]>
      | (T[K]['config']['required'] extends true ? never : undefined)
  }

  export type ExtractAction<
    TSystem extends NoArgCore.System,
    TConfig extends NoArgProgram.Config,
    TOptions extends NoArgCore.Options
  > = (
    args: [
      ...ExtractArguments<NonNullable<TOptions['arguments']>>,
      ...ExtractOptionalArguments<NonNullable<TOptions['optionalArguments']>>,
      ...(TOptions['listArgument'] extends {}
        ? [
            ListArguments: Prettify<
              ExtractListArgument<NonNullable<TOptions['listArgument']>>
            >
          ]
        : []),
      ...(TConfig['enableTrailingArgs'] extends NonNullable<
        NoArgCore.Config['enableTrailingArgs']
      >
        ? [TrailingArguments: string[]]
        : [])
    ],

    flags: Prettify<
      MakeObjectOptional<
        ExtractFlags<
          MergeObject<
            NonNullable<TOptions['globalFlags']>,
            NonNullable<TOptions['flags']>
          >
        >
      >
    >,

    config: TConfig,
    system: TSystem
  ) => void
}
