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
  public programs: NoArgProgramMap = new Map()

  constructor(
    public name: TName,
    public system: TSystem,
    public config: TConfig,
    public options: TOptions
  ) {
    options.flags &&
      Object.keys(options.flags).forEach((name) => {
        verifyFlagName('Flag', name, system.booleanNotSyntaxEnding)
      })

    options.globalFlags &&
      Object.keys(options.globalFlags).forEach((name) => {
        verifyFlagName('Flag', name, system.booleanNotSyntaxEnding)
      })
  }

  static defaultOptions = {
    arguments: [] as [],
    optionalArguments: [] as [],
    flags: {},
    globalFlags: {},
  } as const
}

NoArgCore.defaultOptions satisfies NoArgCore.Options

export module NoArgCore {
  export type Config = {
    disableHelp?: boolean
    ignoreTrailingArgs?: boolean
  }

  export type Options = {
    description?: string
    arguments?: ArgumentsOptions[]
    optionalArguments?: OptionalArgumentsOptions[]
    listArgument?: ListArgumentsOption
    flags?: FlagOption
    globalFlags?: FlagOption
  }

  export type System = {
    equalAssign?: boolean
    duplicateValue?: boolean
    duplicateOption?: boolean
    booleanNotSyntaxEnding?: string
  }

  export type DefaultOptions = typeof NoArgCore.defaultOptions
}
