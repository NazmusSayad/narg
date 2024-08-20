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

  constructor(
    protected name: TName,
    protected system: TSystem,
    protected config: TConfig,
    protected options: TOptions
  ) {
    options.flags &&
      Object.keys(options.flags).forEach((name) => {
        validateFlagName(name, system?.booleanNotSyntaxEnding)
      })

    options.globalFlags &&
      Object.keys(options.globalFlags).forEach((name) => {
        validateFlagName(name, system?.booleanNotSyntaxEnding)
      })
  }
}

export module NoArgCore {
  export type Config = {
    disableHelp?: boolean
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
    booleanNotSyntaxEnding: string
    allowDuplicateFlagForList: boolean
    allowDuplicateFlagForPrimitive?: boolean
    overwriteDuplicateFlagForList?: boolean
    splitListByComma?: string
  }

  export const defaultSystem = {
    allowEqualAssign: true,
    allowDuplicateFlagForList: true,
    booleanNotSyntaxEnding: '\\',
  } as const

  export type DefaultSystem = typeof defaultSystem
  export type DefaultOptions = typeof NoArgCore.defaultOptions

  defaultSystem satisfies System
  defaultOptions satisfies Options
}
