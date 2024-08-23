import {
  FlagOption,
  NoArgProgramMap,
  ArgumentsOptions,
  ListArgumentsOption,
  OptionalArgumentsOptions,
} from './types.t'
import validateFlagName from '../helpers/validate-flag-name'
import { MergeObject, Prettify } from '../types/util.t'

export class NoArgCore<
  TName extends string,
  TSystem extends NoArgCore.System,
  TConfig extends NoArgCore.Config,
  TOptions extends NoArgCore.Options
> {
  protected programs: NoArgProgramMap = new Map()

  private validateNonEmptyString(value: string | undefined, name: string) {
    if (typeof value !== 'string' || !value) {
      throw new Error(`\`${name}\` must be a non empty string`)
    }
  }

  constructor(
    protected name: TName,
    protected system: TSystem,
    protected config: TConfig,
    protected options: TOptions
  ) {
    if (typeof system.booleanNotSyntaxEnding === 'string') {
      this.validateNonEmptyString(
        system.booleanNotSyntaxEnding,
        'system.booleanNotSyntaxEnding'
      )
    }

    this.validateNonEmptyString(
      config.trailingArgsSeparator,
      'config.trailingArgsSeparator'
    )

    options.flags = Object.fromEntries(
      Object.entries(options.flags).sort(([, a]) => {
        return a.config.askQuestion !== undefined ? 1 : -1
      })
    )

    options.globalFlags = Object.fromEntries(
      Object.entries(options.globalFlags).sort(([, a]) => {
        return a.config.askQuestion !== undefined ? 1 : -1
      })
    )

    options.flags &&
      Object.keys(options.flags).forEach((name) => {
        validateFlagName(name, system.booleanNotSyntaxEnding || undefined)
      })

    options.globalFlags &&
      Object.keys(options.globalFlags).forEach((name) => {
        validateFlagName(name, system.booleanNotSyntaxEnding || undefined)
      })
  }
}

export module NoArgCore {
  export type Config = {
    help: boolean
    enableTrailingArgs?: boolean
    trailingArgsSeparator: string
  }

  export type Options = {
    description?: string
    listArgument?: ListArgumentsOption
    arguments: ArgumentsOptions[]
    optionalArguments: OptionalArgumentsOptions[]
    flags: FlagOption
    globalFlags: FlagOption
  }

  export const defaultConfig = {
    help: true,
    trailingArgsSeparator: '--',
  } as const

  export const defaultOptions = {
    arguments: [] as [],
    optionalArguments: [] as [],
    flags: {},
    globalFlags: {},
  } as const

  export type System = {
    allowEqualAssign: boolean
    booleanNotSyntaxEnding: string | false
    allowDuplicateFlagForList: boolean
    allowDuplicateFlagForPrimitive?: boolean
    overwriteDuplicateFlagForList?: boolean
    splitListByComma?: boolean
  }

  export const defaultSystem = {
    allowEqualAssign: true,
    allowDuplicateFlagForList: true,
    booleanNotSyntaxEnding: '\\',
  } as const

  export type DefaultConfig = typeof defaultConfig
  export type DefaultSystem = typeof defaultSystem
  export type DefaultOptions = typeof NoArgCore.defaultOptions

  defaultConfig satisfies Config
  defaultSystem satisfies System
  defaultOptions satisfies Options
}
