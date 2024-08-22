import {
  FlagOption,
  NoArgProgramMap,
  ArgumentsOptions,
  ListArgumentsOption,
  OptionalArgumentsOptions,
} from './types.t'
import validateFlagName from '../helpers/validate-flag-name'

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
      system.trailingArgsSeparator,
      'system.trailingArgsSeparator'
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
    disableHelp?: boolean
    enableTrailingArgs?: boolean
  }

  export type Options = {
    description?: string

    arguments: ArgumentsOptions[]
    optionalArguments: OptionalArgumentsOptions[]
    listArgument?: ListArgumentsOption

    flags: FlagOption
    globalFlags: FlagOption
  }

  export const defaultOptions = {
    arguments: [] as [],
    optionalArguments: [] as [],
    flags: {},
    globalFlags: {},
  } as const

  export type System = {
    allowEqualAssign: boolean
    trailingArgsSeparator: string
    booleanNotSyntaxEnding: string | false
    allowDuplicateFlagForList: boolean
    allowDuplicateFlagForPrimitive?: boolean
    overwriteDuplicateFlagForList?: boolean
    splitListByComma?: boolean
  }

  export const defaultSystem = {
    allowEqualAssign: true,
    trailingArgsSeparator: '--',
    allowDuplicateFlagForList: true,
    booleanNotSyntaxEnding: '\\',
  } as const

  export type DefaultSystem = typeof defaultSystem
  export type DefaultOptions = typeof NoArgCore.defaultOptions

  defaultSystem satisfies System
  defaultOptions satisfies Options
}
