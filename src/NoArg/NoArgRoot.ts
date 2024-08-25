import colors from '../lib/colors'
import adminSymbol from './admin-symbol'
import { NoArgCoreHelper } from './NoArgCore'
import { TypeArray } from '../schema/TypeArray'
import { TypeTuple } from '../schema/TypeTuple'
import { TypeNumber } from '../schema/TypeNumber'
import { TypeString } from '../schema/TypeString'
import { TypeBoolean } from '../schema/TypeBoolean'
import { TSchemaPrimitive } from '../schema/type.t'
import { NoArgProgram, NoArgProgramHelper } from './NoArgProgram'
import { MergeObject, MergeObjectPrettify, Prettify } from '../types/util.t'

export class NoArgRoot<
  TName extends string,
  TSystem extends NoArgCoreHelper.System,
  TConfig extends NoArgProgramHelper.Config,
  TOptions extends NoArgCoreHelper.Options
> extends NoArgProgram<TName, TSystem, TConfig, TOptions> {
  static colors = {
    disable() {
      colors.enabled = false
    },
    enable() {
      colors.enabled = true
    },
  }

  /**
   * Create a new string schema
   * @param strings You can enter a fixed set of strings
   * @example
   * NoArg.string('a', 'b', 'c') // Only 'a', 'b', 'c' are allowed
   */
  static string<const T extends string[]>(...strings: T) {
    const config = {} as any
    if (strings.length) {
      config.enum = new Set(strings)
    }

    return new TypeString(
      config as T extends [] ? {} : { enum: Set<T[number]> }
    )
  }

  /**
   * Create a new number schema
   * @param numbers You can enter a fixed set of numbers
   * @example
   * NoArg.number(1, 2, 3) // Only 1, 2, 3 are allowed
   */
  static number<const T extends number[]>(...numbers: T) {
    const config = {} as any
    if (numbers.length) {
      config.enum = new Set(numbers)
    }

    return new TypeNumber(
      config as T extends [] ? {} : { enum: Set<T[number]> }
    )
  }

  static boolean() {
    return new TypeBoolean({})
  }

  /**
   * ### ⚠️ Only available for flags.
   */
  static array<T extends TSchemaPrimitive>(schema: T) {
    delete schema.config.aliases
    delete schema.config.default
    delete schema.config.required
    delete schema.config.askQuestion
    delete schema.config.description

    const config = { schema }
    return new TypeArray(config)
  }

  /**
   * ### ⚠️ Only available for flags.
   */
  static tuple<T extends TSchemaPrimitive[]>(...schema: T) {
    const config = {
      schema: schema.map((s) => {
        s.config.required = true
        delete s.config.aliases
        delete s.config.askQuestion
        delete s.config.description

        return s
      }),
    }
    return new TypeTuple(config)
  }

  /**
   * Create a new NoArgRoot instance
   * @param name The name of the program
   * @param options The options for the program
   * @returns A new NoArgRoot instance
   * @example
   * const program = NoArgRoot.create('my-program', {
   *  description: 'This is my program',
   *  arguments: [
   *    { name: 'arg1', description: 'This is the first argument' }
   *  ],
   *  optionalArguments: [
   *    { name: 'opt1', description: 'This is the first optional argument' }
   *  ],
   *  flags: {
   *    flag1: t.string()
   *  },
   *  globalFlags: {
   *    globalFlag1: t.string()
   *  }
   * })
   *
   * program.start()
   */
  static create<
    const TName extends string,
    const TCreateConfig extends NoArgRoot.CreateConfig
  >(name: TName, { config, system, ...options }: TCreateConfig) {
    type TSystem = MergeObjectPrettify<
      NoArgCoreHelper.DefaultSystem,
      Required<NonNullable<TCreateConfig['system']>>
    >

    type TConfig = MergeObjectPrettify<
      NoArgCoreHelper.DefaultConfig,
      Required<NonNullable<TCreateConfig['config']>>
    >

    type TOptions = Prettify<
      Required<
        MergeObject<
          NoArgCoreHelper.DefaultOptions,
          Omit<TCreateConfig, 'config' | 'system'>
        >
      >
    >

    return new NoArgRoot<TName, TSystem, TConfig, TOptions>(
      adminSymbol,
      name,
      {
        ...NoArgCoreHelper.defaultSystem,
        ...system,
      } as TSystem,
      {
        ...NoArgCoreHelper.defaultConfig,
        ...config,
      } as TConfig,
      {
        ...NoArgCoreHelper.defaultOptions,
        ...options,
      } as unknown as TOptions
    )
  }

  /**
   * Define the configuration for the program
   * - This doesn't do anything except returning the config
   * - This is a helper function to make the type inference better
   * @param config The configuration for the program
   */
  static defineConfig<const T extends NoArgRoot.CreateConfig>(config: T) {
    return config as Prettify<T>
  }

  constructor(
    symbol: symbol,
    name: TName,
    system: TSystem,
    config: TConfig,
    options: TOptions
  ) {
    if (symbol !== adminSymbol) {
      throw new Error(
        'NoArg is not meant to be instantiated directly. Use NoArgProgramHelper.create() instead. But if really need this contact the developer. This is disabled just for safety.'
      )
    }

    super(name, system, config, options as any)
  }

  /**
   * Start the program
   * @param args The arguments to start the program with
   * @example
   * program.start()
   * program.start(['--flag1', 'value1'])
   * program.start(['arg1', '--flag1', 'value1'])
   * program.start(['arg1', '--flag1', 'value1', '--globalFlag1', 'value2'])
   */
  public start(args: string[] = process.argv.slice(2)) {
    this.startCore(args)
  }
}

export module NoArgRoot {
  export type CreateConfig = Prettify<
    Partial<NoArgCoreHelper.Options> & {
      config?: Partial<NoArgCoreHelper.Config>
      system?: Partial<NoArgCoreHelper.System>
    }
  >

  export type InferFlags<T> = T extends NoArgProgram<
    string,
    any,
    any,
    infer TOptions
  >
    ? NoArgProgramHelper.ExtractFlags<TOptions['flags']>
    : never

  export type InferGlobalFlags<T> = T extends NoArgProgram<
    string,
    any,
    any,
    infer TOptions
  >
    ? NoArgProgramHelper.ExtractFlags<TOptions['globalFlags']>
    : never

  export type InferCombinedFlags<T> = T extends NoArgProgram<
    string,
    any,
    any,
    infer TOptions
  >
    ? NoArgProgramHelper.ExtractCombinedFlags<TOptions>
    : never

  export type InferArguments<T> = T extends NoArgProgram<
    string,
    any,
    any,
    infer TOptions
  >
    ? NoArgProgramHelper.ExtractArguments<TOptions['arguments']>
    : never

  export type InferOptionalArguments<T> = T extends NoArgProgram<
    string,
    any,
    any,
    infer TOptions
  >
    ? NoArgProgramHelper.ExtractOptionalArguments<TOptions['optionalArguments']>
    : never

  export type InferListArguments<T> = T extends NoArgProgram<
    string,
    any,
    any,
    infer TOptions
  >
    ? undefined extends TOptions['listArgument']
      ? never
      : NoArgProgramHelper.ExtractListArgument<
          NonNullable<TOptions['listArgument']>
        >
    : never

  export type InferCombinedArgs<T> = T extends NoArgProgram<
    string,
    any,
    any,
    infer TOptions
  >
    ? NoArgProgramHelper.ExtractCombinedArgs<TOptions>
    : never
}
