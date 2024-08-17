import verifyFlagName from '../helpers/verify-flag-name'
import { NoArgOptions, NoArgProgramMap, NoArgSystem } from './types.t'

export default class<
  TName extends string,
  TConfig extends NoArgCoreConfig,
  TOptions extends NoArgOptions,
  TSystem extends NoArgSystem
> {
  public programs: NoArgProgramMap = new Map()

  constructor(
    public name: TName,
    public config: TConfig,
    public options: TOptions,
    public action: Function,
    public system: TSystem
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
}

export type NoArgCoreConfig = {
  disableHelp?: boolean
  ignoreTrailingArgs?: boolean
}

export const defaultNoArgOptions = {
  arguments: [] as [],
  optionalArguments: [] as [],
  flags: {},
  globalFlags: {},
}

defaultNoArgOptions satisfies NoArgOptions
