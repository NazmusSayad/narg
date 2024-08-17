import { MergeObject, Prettify } from '../types/util.t'
import { NoArgOptions, NoArgSystem as NoArgSystem } from './types.t'
import { defaultNoArgOptions, NoArgCoreConfig } from './NoArgCore'
import adminSymbol from './admin-symbol'
import NoArgProgram, { NoArgProgramConfig } from './NoArgProgram'

export default class NoArg<
  TName extends string,
  TConfig extends NoArgProgramConfig,
  TOptions extends NoArgOptions,
  TSystem extends NoArgSystem
> extends NoArgProgram<TName, TConfig, TOptions, TSystem> {
  constructor(
    symbol: symbol,
    name: TName,
    config: TConfig,
    options: TOptions,
    action: Function,
    system: TSystem
  ) {
    if (symbol !== adminSymbol) {
      throw new Error(
        'NoArg is not meant to be instantiated directly. Use NoArgProgram.create() instead. But if really need this contact the developer. This is disabled just for safety.'
      )
    }

    super(name, config, options as any, action, system)
  }

  static create<
    const TName extends string,
    const TCreateConfig extends NoArgOptions & {
      config?: NoArgCoreConfig
      system?: NoArgSystem
    }
  >(
    name: TName,
    { config, system, ...options }: TCreateConfig,
    action: Function
  ) {
    type TOptions = Omit<TCreateConfig, 'config' | 'system'>
    type TConfig = TCreateConfig['config'] extends NoArgCoreConfig
      ? TCreateConfig['config']
      : {}
    type TSystem = TCreateConfig['system'] extends NoArgSystem
      ? TCreateConfig['system']
      : {}

    return new NoArg<
      TName,
      Prettify<TConfig>,
      Prettify<MergeObject<typeof defaultNoArgOptions, TOptions>>,
      Prettify<TSystem>
    >(
      adminSymbol,
      name,
      config ?? ({} as any),
      { ...defaultNoArgOptions, ...options } as any,
      action,
      { ...system } as any
    )
  }

  public run() {
    return this.action(this.system)
  }
}
