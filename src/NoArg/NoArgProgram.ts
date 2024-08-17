import { Prettify, MergeObject } from '../types/util.t'
import { NoArgCore } from './NoArgCore'
import { NoArgParser } from './NoArgParser'
import { FlagOption } from './types.t'

export class NoArgProgram<
  TName extends string,
  TSystem extends NoArgCore.System,
  TConfig extends NoArgProgram.Config,
  TOptions extends NoArgCore.Options
> extends NoArgParser<TName, TSystem, TConfig, TOptions> {
  public create<
    const TName extends string,
    const TCreateOptionsWithConfig extends NoArgCore.Options & {
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
        ...options.globalFlags,
      }
    }

    type TInnerConfig = NonNullable<TCreateOptionsWithConfig['config']>
    type TInnerOptions = Omit<
      TCreateOptionsWithConfig,
      'config'
    > extends NoArgCore.Options
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
      Prettify<TInnerOptionsWithGlobalFlags>
    >(name, this.system, (config ?? {}) as any, options as any)

    this.programs.set(name, child as any)
    return child
  }

  public action?: (...args: any[]) => void
  public on(callback: NoArgProgram.ExtractAction<TSystem, TConfig, TOptions>) {
    this.action = callback as any
    return this
  }
}

export module NoArgProgram {
  export type Config = NoArgCore.Config & {
    skipGlobalFlags?: boolean
  }

  export type ExtractFlags<T extends FlagOption> = Prettify<{
    [K in keyof T]: T[K]['name']
  }>

  export type ExtractAction<
    TSystem extends NoArgCore.System,
    TConfig extends NoArgProgram.Config,
    TOptions extends NoArgCore.Options
  > = (
    arg: {
      flags: ExtractFlags<
        MergeObject<
          NonNullable<TOptions['flags']>,
          NonNullable<TOptions['globalFlags']>
        >
      >
    },
    config: TConfig
  ) => void
}
