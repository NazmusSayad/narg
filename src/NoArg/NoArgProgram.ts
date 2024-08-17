import { Prettify, MergeObject } from '../types/util.t'
import { NoArgOptions, NoArgSystem } from './types.t'
import { defaultNoArgOptions, NoArgCoreConfig } from './NoArgCore'
import NoArgParser from './NoArgParser'

export default class NoArgProgram<
  TName extends string,
  TConfig extends NoArgProgramConfig,
  TOptions extends NoArgOptions,
  TSystem extends NoArgSystem
> extends NoArgParser<TName, TConfig, TOptions, TSystem> {
  renderHelp() {}

  public create<
    TName extends string,
    TCreateOptionsWithConfig extends NoArgOptions & {
      config?: NoArgProgramConfig
    }
  >(
    name: TName,
    { config, ...options }: TCreateOptionsWithConfig,
    action: Function
  ) {
    if (
      !config?.skipGlobalFlags &&
      (options.globalFlags || this.options.globalFlags)
    ) {
      options.globalFlags ??= {
        ...this.options.globalFlags,
        ...options.globalFlags,
      }
    }

    config = {
      ...this.config,
      ...config,
    }

    options = {
      ...defaultNoArgOptions,
      ...options,
    }

    // FIXME:

    // Split Create options into inner options and inner config
    type TInnerConfig =
      TCreateOptionsWithConfig['config'] extends NoArgProgramConfig
        ? TCreateOptionsWithConfig['config']
        : {}
    type TInnerOptions = Omit<
      TCreateOptionsWithConfig,
      'config'
    > extends NoArgOptions
      ? Omit<TCreateOptionsWithConfig, 'config'>
      : never

    type TParentConfig = Pick<
      TConfig,
      Extract<keyof NoArgProgramConfig, keyof TConfig>
    >

    type TProgramConfig = MergeObject<TParentConfig, TInnerConfig>

    type TCombinedGlobalFlags = TInnerConfig extends NoArgProgramConfig
      ? TInnerConfig['skipGlobalFlags'] extends true
        ? TInnerOptions['globalFlags']
        : Prettify<
            MergeObject<
              TOptions['globalFlags'] extends object
                ? TOptions['globalFlags']
                : {},
              TInnerOptions['globalFlags'] extends object
                ? TInnerOptions['globalFlags']
                : {}
            >
          >
      : never

    type TProgramOptions = Omit<TInnerOptions, 'globalFlags'> &
      keyof TCombinedGlobalFlags extends never
      ? {}
      : { globalFlags: TCombinedGlobalFlags }

    const child = new NoArgProgram<
      TName,
      Prettify<TProgramConfig>,
      Prettify<
        Omit<typeof defaultNoArgOptions, keyof TProgramOptions> &
          TProgramOptions
      >,
      TSystem
    >(name, (config ?? {}) as any, options as any, action, this.system)

    this.programs.set(name, child)
    return child
  }
}

export type NoArgProgramConfig = Prettify<
  NoArgCoreConfig & {
    skipGlobalFlags?: boolean
  }
>
