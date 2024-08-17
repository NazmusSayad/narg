import { TSchema, TSchemaPrimitive } from '../schema/type.t'
import { NoArgCore } from './NoArgCore'
import { NoArgProgram } from './NoArgProgram'

export type ArgumentsOptions = {
  name: string
  type?: TSchemaPrimitive
  description?: string
}

export type OptionalArgumentsOptions = ArgumentsOptions & {
  // Nothing :)
}

export type ListArgumentsOption = ArgumentsOptions & {
  minLength?: number
  maxLength?: number
}

export type FlagOption = Record<string, TSchema>

export type NoArgProgramMap = Map<
  string,
  NoArgProgram<string, NoArgProgram.Config, NoArgCore.Options, NoArgCore.System>
>
