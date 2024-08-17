import { NoArgOptions, NoArgSystem } from './types.t'
import NoArgCore, { NoArgCoreConfig } from './NoArgCore'

export default class<
  TName extends string,
  TConfig extends NoArgCoreConfig,
  TOptions extends NoArgOptions,
  TSystem extends NoArgSystem
> extends NoArgCore<TName, TConfig, TOptions, TSystem> {
  parse() {}
}
