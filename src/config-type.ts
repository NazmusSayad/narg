import {
  TSchema,
  TPrimitive,
  CheckUndefined,
  ExtractTypeOutput,
} from './schemaType/type.t'
import NoArg from './NoArg'
import { Prettify } from './utils'
import { TypeCore } from './schemaType/index'
import { MakeObjectOptional } from './util.t'
import { defaultNoArgConfig } from './config'

export type ArgumentConfig = {
  name: string
  type?: TPrimitive
  description?: string
}

export type ListArgumentConfig = ArgumentConfig & {
  minLength?: number
  maxLength?: number
}

export type FlagRecord = {
  raw: string
  key: string | null
  value: string | null
  optionType: 'flag' | 'alias' | null
  hasBooleanEndValue: boolean
}

export type TypeConfig = {
  aliases?: string[]
  description?: string
  required?: boolean
  global?: boolean
  default?: any
  ask?: string
}

export type NoArgOptions = {
  name: string
  programs?: Record<string, NoArg<NoArgOptions>>
  options?: Record<string, TSchema>
  arguments?: ArgumentConfig[]
  optionalArguments?: ArgumentConfig[]
  listArgument?: ListArgumentConfig
  description?: string
}

export type NoArgConfig = Partial<
  typeof defaultNoArgConfig & { parent: NoArg<NoArgOptions> }
>

export type MixConfig<
  TFrom extends NoArgOptions,
  TConfig extends NoArgOptions
> = Prettify<
  { options: MixOptions<TFrom['options'], TConfig['options']> } & Omit<
    TConfig,
    'options'
  >
>

export type MixOptions<
  PrevOptions extends NoArgOptions['options'],
  NewOptions extends NoArgOptions['options']
> = Prettify<
  {
    [Key in keyof PrevOptions as PrevOptions[Key] extends TypeCore<infer Config>
      ? Config extends { global: true }
        ? Key
        : never
      : never]: PrevOptions[Key]
  } & NewOptions
>

type ExtractActionArgsMain<Arguments extends ArgumentConfig[]> = {
  [Key in keyof Arguments]: Arguments[Key] extends { type: TPrimitive }
    ? ExtractTypeOutput<Arguments[Key]['type']>
    : Arguments[Key] extends { name: string }
    ? string
    : never
}

type ExtractActionArgsOptional<Arguments extends ArgumentConfig[]> = {
  [Key in keyof Arguments]: Arguments[Key] extends { type: TPrimitive }
    ? ExtractTypeOutput<Arguments[Key]['type']>
    : Arguments[Key] extends { name: string }
    ? string
    : never
}

type ExtractActionArgsList<ListArgument extends ListArgumentConfig> =
  ListArgument extends {
    type: TPrimitive
  }
    ? ExtractTypeOutput<ListArgument['type']>[]
    : ListArgument extends { name: string }
    ? string[]
    : never

type ExtractActionOptions<Options extends NoArgOptions['options']> =
  MakeObjectOptional<{
    -readonly [Key in keyof Options]:
      | ExtractTypeOutput<Options[Key]>
      | Exclude<
          Options[Key] extends TSchema
            ? CheckUndefined<Options[Key]['config']>
            : never,
          'never'
        >
  }>

export type Action<
  TConfig extends Pick<
    NoArgOptions,
    'arguments' | 'optionalArguments' | 'listArgument' | 'options'
  >
> = {
  (config: {
    options: undefined extends TConfig['options']
      ? {}
      : ExtractActionOptions<TConfig['options']>

    args: undefined extends TConfig['arguments']
      ? never[]
      : ExtractActionArgsMain<NonNullable<TConfig['arguments']>>

    optArgs: undefined extends TConfig['optionalArguments']
      ? never[]
      : ExtractActionArgsOptional<NonNullable<TConfig['optionalArguments']>>

    listArgs: undefined extends TConfig['listArgument']
      ? never[]
      : ExtractActionArgsList<NonNullable<TConfig['listArgument']>>
  }): void
}
