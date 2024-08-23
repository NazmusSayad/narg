import { TSchema, TSchemaPrimitive } from '../schema/type.t'
import { NoArgCoreHelper } from './NoArgCore'
import { NoArgProgram } from './NoArgProgram'

export type ArgumentsOptions = {
  name: string
  type: TSchemaPrimitive
  description?: string
}

export type OptionalArgumentsOptions = ArgumentsOptions & {}

export type ListArgumentsOption = ArgumentsOptions & {
  minLength?: number
  maxLength?: number
}

export type FlagOption = Record<string, TSchema>

export type NoArgProgramMap = Map<
  string,
  NoArgProgram<
    string,
    NoArgCoreHelper.System,
    NoArgProgram.Config,
    NoArgCoreHelper.Options
  >
>
