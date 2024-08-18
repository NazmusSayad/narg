import {
  TSchemaPrimitive,
  ExtractTypeOutput,
  ExtractTypeUndefined,
} from '../schema/type.t'
import {
  FlagOption,
  ArgumentsOptions,
  ListArgumentsOption,
  OptionalArgumentsOptions,
} from './types.t'
import colors from '../lib/colors'
import { CellValue } from 'cli-table3'
import { NoArgCore } from './NoArgCore'
import { CustomTable } from '../lib/table'
import { NoArgParser } from './NoArgParser'
import { Prettify, MergeObject, MakeObjectOptional } from '../types/util.t'

export class NoArgProgram<
  TName extends string,
  TSystem extends NoArgCore.System,
  TConfig extends NoArgProgram.Config,
  TOptions extends NoArgCore.Options
> extends NoArgParser<TName, TSystem, TConfig, TOptions> {
  parent?: NoArgProgram<any, any, any, any>

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

  public create<
    const TName extends string,
    const TCreateOptionsWithConfig extends Partial<NoArgCore.Options> & {
      config?: NoArgProgram.Config
    }
  >(name: TName, { config, ...options }: TCreateOptionsWithConfig) {
    config = {
      ...this.config,
      ...config,
    }

    options = {
      ...NoArgCore.defaultOptions,
      ...options,
    }

    if (!config.skipGlobalFlags) {
      options.globalFlags ??= {
        ...this.options.globalFlags,
        ...(options.globalFlags as any),
      }
    }

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
              readonly globalFlags: Prettify<
                MergeObject<
                  TOptions['globalFlags'],
                  TInnerOptions['globalFlags']
                >
              >
            }
          >

    const child = new NoArgProgram<
      TName,
      TSystem,
      Prettify<MergeObject<TConfig, TInnerConfig>>,
      Prettify<Required<TInnerOptionsWithGlobalFlags>>
    >(name, this.system, config as any, options as any, this)

    this.programs.set(name, child as any)
    return child
  }

  public action?: (...args: any[]) => void
  public on(callback: NoArgProgram.ExtractAction<TSystem, TConfig, TOptions>) {
    this.action = callback as any
    return this
  }

  private helpColors = {
    type: colors.yellow,
    description: colors.reset,
    programs: colors.red,
    arguments: colors.blue,
    flags: colors.cyan,
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
      commandItems.push(
        this.helpColors.programs(
          `(${[...this.programs.values()]
            .map((program) => program.name)
            .join('|')})`
        )
      )
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

    const argumentData = this.options.arguments.map<
      [CellValue, CellValue, CellValue]
    >((argument) => {
      const { name, type, description } = argument
      return [
        this.helpColors.arguments(name),
        this.helpColors.type(type?.name ?? 'string'),
        this.helpColors.description(description ?? this.helpColors.emptyString),
      ]
    })

    const optArgumentData = this.options.optionalArguments.map<
      [CellValue, CellValue, CellValue]
    >((argument) => {
      const { name, type, description } = argument
      return [
        this.helpColors.arguments(name),
        this.helpColors.type(type?.name ?? 'string') + '?',
        this.helpColors.description(description ?? this.helpColors.emptyString),
      ]
    })

    CustomTable([5, 3, 10], ...(argumentData ?? []), ...(optArgumentData ?? []))
  }

  private renderHelpListArgument() {
    const { name, type, minLength, maxLength } = this.options.listArgument!
    console.log(
      colors.bold('List Argument: ') + this.helpColors.arguments(name)
    )
    console.log('', colors.black('----------------'))

    console.log(
      '',
      'Argument Type  :',
      this.helpColors.type(type?.name ?? 'string')
    )

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
      console.log('', colors.dim('Tips: You can also leave it empty'))
  }

  private renderHelpFlags(title: string, flags: FlagOption) {
    title && console.log(colors.bold(title))

    const optionData = Object.entries(flags)
      .sort(([keyA], [keyB]) => {
        if (keyA > keyB) return 1
        if (keyA < keyB) return -1
        return 0
      })
      .sort(([, a]) => {
        const isRequired = a.config.required
        const hasDefault = 'default' in a.config
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
          this.helpColors.type(schema.name) +
          (schema.config.required
            ? 'default' in schema.config || 'ask' in schema.config
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

    CustomTable([5, 3, 10], ...optionData)
  }

  public help() {
    this.renderHelpOverview()
    console.log('')

    if (this.programs.size) {
      this.renderHelpPrograms()
      console.log('')
    }

    if (
      this.options.arguments.length ||
      this.options.optionalArguments.length
    ) {
      this.renderHelpArguments()
      console.log('')
    }

    if (this.options.listArgument) {
      this.renderHelpListArgument()
      console.log('')
    }

    const hasFlags = Object.keys(this.options.flags).length
    const hasGlobalFlags = Object.keys(this.options.globalFlags).length

    if (hasFlags || hasGlobalFlags) {
      hasFlags && this.renderHelpFlags('Flags:', this.options.flags)
      hasGlobalFlags && this.renderHelpFlags('', this.options.globalFlags)

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
      console.log(' -', colors.black(args.join(' ')))
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
      this.helpColors.flags('flags')
    )

    console.log(
      '',
      "This is the structure of the command line. It's the order of the arguments and options that you want to pass to the command. The order is important and can't be changed."
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(colors.yellow('programs'))
    console.log(
      '',
      "This is the command that you want to run. It's the first argument of the command line."
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(colors.blue('fixed-arguments'))
    console.log(
      '',
      "These are the arguments that you want to pass to the command. Their position and length is fixed and can't be changed."
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(colors.blue('optional-arguments'))
    console.log(
      '',
      'These are the arguments that you want to pass to the command. They are optional and can be changed.'
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(colors.green('list-arguments'))
    console.log(
      '',
      'These are the arguments that you want to pass to the command. They are list of values and length can vary on configuration. They also can be optional.'
    )

    console.log('')
    this.renderUsageUtils.printPointHeader(colors.red('flags'))
    console.log(
      '',
      'These are the options that you want to pass to the command. They are optional and can be changed.'
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

  private renderUsageConfiguration() {
    if (this.system.equalAssign) {
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
  }

  public usage() {
    console.log(colors.bold(colors.cyan('📝 Structure:')))
    this.renderUsageStructure()
    console.log('')

    console.log(colors.bold(colors.cyan('📝 How to use:')))
    this.renderUsageHowToUseOptions()
    console.log('')

    console.log(colors.bold(colors.cyan('📝 Configuration:')))
    this.renderUsageConfiguration()
    console.log('')
  }
}

export module NoArgProgram {
  export type Config = NoArgCore.Config & {
    skipGlobalFlags?: boolean
  }

  export type ExtractArguments<T extends ArgumentsOptions[]> = {
    [K in keyof T]: T[K]['type'] extends TSchemaPrimitive
      ? ExtractTypeOutput<T[K]['type']>
      : string
  }

  export type ExtractOptionalArguments<T extends OptionalArgumentsOptions[]> =
    Partial<ExtractArguments<T>>

  export type ExtractListArgument<T extends ListArgumentsOption> =
    T['type'] extends TSchemaPrimitive
      ? ExtractTypeOutput<T['type']>[]
      : string[]

  export type ExtractFlags<T extends FlagOption> = {
    [K in keyof T]:
      | ExtractTypeOutput<T[K]>
      | ExtractTypeUndefined<T[K]['config']>
  }

  export type ExtractAction<
    TSystem extends NoArgCore.System,
    TConfig extends NoArgProgram.Config,
    TOptions extends NoArgCore.Options
  > = (
    args: [
      ...ExtractArguments<NonNullable<TOptions['arguments']>>,
      ...ExtractOptionalArguments<NonNullable<TOptions['optionalArguments']>>,
      ExtractListArgument<NonNullable<TOptions['listArgument']>>
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

    config: TConfig
  ) => void
}
