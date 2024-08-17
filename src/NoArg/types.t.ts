import { TSchema, TSchemaPrimitive } from '../schema/type.t'
import NoArgProgram, { NoArgProgramConfig } from './NoArgProgram'

export type ArgumentsOptions = {
  name: string
  type?: TSchemaPrimitive
  description?: string
}

export type OptionalArgumentsOptions = ArgumentsOptions & {
  // Nothing :)
}

export type ListArgumentsOptions = ArgumentsOptions & {
  minLength?: number
  maxLength?: number
}

export type NoArgOptions = {
  description?: string
  arguments?: ArgumentsOptions[]
  optionalArguments?: OptionalArgumentsOptions[]
  listArgument?: ListArgumentsOptions
  flags?: Record<string, TSchema>
  globalFlags?: Record<string, TSchema>
}

export type NoArgSystem = {
  equalAssign?: boolean
  duplicateValue?: boolean
  duplicateOption?: boolean
  booleanNotSyntaxEnding?: string
}

export type NoArgProgramMap = Map<
  string,
  NoArgProgram<string, NoArgProgramConfig, NoArgOptions, NoArgSystem>
>
