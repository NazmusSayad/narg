import colors from '../lib/colors'
import { NoArgCore } from './NoArgCore'
import adminSymbol from './admin-symbol'
import { NoArgProgram } from './NoArgProgram'
import { TypeArray } from '../schema/TypeArray'
import { TypeTuple } from '../schema/TypeTuple'
import { TypeNumber } from '../schema/TypeNumber'
import { TypeString } from '../schema/TypeString'
import { TypeBoolean } from '../schema/TypeBoolean'
import { TSchemaPrimitive } from '../schema/type.t'
import { MergeObject, MergeObjectPrettify, Prettify } from '../types/util.t'

export class NoArgRoot<
  TName extends string,
  TSystem extends NoArgCore.System,
  TConfig extends NoArgProgram.Config,
  TOptions extends NoArgCore.Options
> extends NoArgProgram<TName, TSystem, TConfig, TOptions> {
  static colors = {
    disable() {
      colors.enabled = false
    },
    enable() {
      colors.enabled = true
    },
  }

  static string<const T extends string[]>(...strings: T) {
    const config = {} as any
    if (strings.length) {
      config.enum = new Set(strings)
    }

    return new TypeString(
      config as T extends [] ? {} : { enum: Set<T[number]> }
    )
  }

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
      NoArgCore.DefaultSystem,
      Required<NonNullable<TCreateConfig['system']>>
    >

    type TConfig = MergeObjectPrettify<
      NoArgCore.DefaultConfig,
      Required<NonNullable<TCreateConfig['config']>>
    >

    type TOptions = Prettify<
      Required<
        MergeObject<
          NoArgCore.DefaultOptions,
          Omit<TCreateConfig, 'config' | 'system'>
        >
      >
    >

    return new NoArgRoot<TName, TSystem, TConfig, TOptions>(
      adminSymbol,
      name,
      {
        ...NoArgCore.defaultSystem,
        ...system,
      } as TSystem,
      {
        ...NoArgCore.defaultConfig,
        ...config,
      } as TConfig,
      {
        ...NoArgCore.defaultOptions,
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
        'NoArg is not meant to be instantiated directly. Use NoArgProgram.create() instead. But if really need this contact the developer. This is disabled just for safety.'
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
    Partial<NoArgCore.Options> & {
      config?: Partial<NoArgCore.Config>
      system?: Partial<NoArgCore.System>
    }
  >
}
