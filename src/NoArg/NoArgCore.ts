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
  TSystem extends NoArgCoreHelper.System,
  TConfig extends NoArgCoreHelper.Config,
  TOptions extends NoArgCoreHelper.Options
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

    if (options.trailingArguments) {
      this.validateNonEmptyString(
        options.trailingArguments,
        'options.trailingArguments'
      )
    }

    if (options.flags) {
      Object.keys(options.flags).forEach((name) => {
        validateFlagName(name, system.booleanNotSyntaxEnding || undefined)
      })
    }

    if (options.globalFlags) {
      Object.keys(options.globalFlags).forEach((name) => {
        validateFlagName(name, system.booleanNotSyntaxEnding || undefined)
      })
    }

    this.system = Object.freeze({ ...system })
    this.config = Object.freeze({ ...config })
    this.options = Object.freeze({ ...options })
  }
}

export module NoArgCoreHelper {
  export type Config = {
    readonly help: boolean
  }

  export type Options = {
    readonly description?: string
    readonly notes?: string[]

    readonly arguments: ArgumentsOptions[]
    readonly optionalArguments: OptionalArgumentsOptions[]

    readonly listArgument?: ListArgumentsOption
    readonly trailingArguments?: string

    readonly flags: FlagOption
    readonly globalFlags: FlagOption

    readonly customRenderHelp?: {
      helpUsageStructure?: string
      helpUsageTrailingArgsLabel?: string
    }
  }

  export const defaultConfig = {
    help: true,
  } as const

  export const defaultOptions = {
    arguments: [] as [],
    optionalArguments: [] as [],
    flags: {},
    globalFlags: {},
  } as const

  export type System = {
    readonly allowEqualAssign: boolean
    readonly booleanNotSyntaxEnding: string | false
    readonly allowDuplicateFlagForList: boolean
    readonly allowDuplicateFlagForPrimitive?: boolean
    readonly overwriteDuplicateFlagForList?: boolean
    readonly splitListByComma?: boolean
  }

  export const defaultSystem = {
    allowEqualAssign: true,
    allowDuplicateFlagForList: true,
    booleanNotSyntaxEnding: '\\',
  } as const

  export type DefaultConfig = typeof defaultConfig
  export type DefaultSystem = typeof defaultSystem
  export type DefaultOptions = typeof NoArgCoreHelper.defaultOptions

  defaultConfig satisfies Config
  defaultSystem satisfies System
  defaultOptions satisfies Options
}
