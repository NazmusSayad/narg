import { NoArgCore } from './NoArgCore'
import adminSymbol from './admin-symbol'
import { NoArgProgram } from './NoArgProgram'
import { MergeObject, Prettify } from '../types/util.t'

export class NoArgRoot<
  TName extends string,
  TSystem extends NoArgCore.System,
  TConfig extends NoArgProgram.Config,
  TOptions extends NoArgCore.Options
> extends NoArgProgram<TName, TSystem, TConfig, TOptions> {
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
    const TCreateConfig extends Prettify<
      Partial<NoArgCore.Options> & {
        config?: NoArgCore.Config
        system?: Partial<NoArgCore.System>
      }
    >
  >(name: TName, { config, system, ...options }: TCreateConfig) {
    system = { ...NoArgCore.defaultSystem, ...system }
    config = { ...config }

    type TSystem = MergeObject<
      NoArgCore.DefaultSystem,
      Required<NonNullable<TCreateConfig['system']>>
    >

    type TOptions = MergeObject<
      NoArgCore.DefaultOptions,
      Omit<TCreateConfig, 'config' | 'system'>
    >

    type TConfig = NonNullable<TCreateConfig['config']>
    return new NoArgRoot<
      TName,
      Prettify<TSystem>,
      Prettify<TConfig>,
      Prettify<Required<TOptions>>
    >(
      adminSymbol,
      name,
      system as any,
      config as any,
      {
        ...NoArgCore.defaultOptions,
        ...options,
      } as any
    )
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

export module NoArgRoot {}
