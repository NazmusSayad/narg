import {
  FlagOption,
  NoArgProgramMap,
  ArgumentsOptions,
  ListArgumentsOption,
  OptionalArgumentsOptions,
} from './types.t'
import verifyFlagName from '../helpers/verify-flag-name'

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
        verifyFlagName('Flag', name, system?.booleanNotSyntaxEnding)
      })

    options.globalFlags &&
      Object.keys(options.globalFlags).forEach((name) => {
        verifyFlagName('Flag', name, system?.booleanNotSyntaxEnding)
      })
  }
}

NoArgCore.defaultOptions satisfies NoArgCore.Options

export module NoArgCore {
  export type Config = {
    disableHelp?: boolean
    disableUsage?: boolean
    ignoreTrailingArgs?: boolean
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
    equalAssign: boolean
    booleanNotSyntaxEnding: string
  }

  export const defaultSystem = {
    equalAssign: true,
    booleanNotSyntaxEnding: '--',
  } as const

  export type DefaultSystem = typeof defaultSystem

  export type DefaultOptions = typeof NoArgCore.defaultOptions
}
