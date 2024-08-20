import { TSchema, TSchemaPrimitive } from '../schema/type.t'
import { NoArgCore } from './NoArgCore'
import { NoArgProgram } from './NoArgProgram'

export type ArgumentsOptions = {
  name: string
  type?: TSchemaPrimitive
  // description?: string
  // askQuestion?: string
}

export type OptionalArgumentsOptions = Omit<ArgumentsOptions, 'ask'> & {}

export type ListArgumentsOption = Omit<ArgumentsOptions, 'ask'> & {
  minLength?: number
  maxLength?: number
}

export type FlagOption = Record<string, TSchema>

export type NoArgProgramMap = Map<
  string,
  NoArgProgram<string, NoArgCore.System, NoArgProgram.Config, NoArgCore.Options>
>
