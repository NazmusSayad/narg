import {
  TSchema,
  TPrimitive,
  CheckUndefined,
  ExtractTypeOutput,
} from './schemaType/type.t'
import Program from './program'
import { Prettify } from './utils'
import { TypeCore } from './schemaType/index'

export type ArgumentConfig = {
  name: string
  type?: TPrimitive
  description?: string
}

export type ListArgumentConfig = ArgumentConfig & {
  minLength?: number
  maxLength?: number
}

export type TypeConfig = {
  aliases?: string[]
  description?: string
  required?: boolean
  global?: boolean
  default?: any
}

export type Config = {
  programs?: Record<string, Program<Lowercase<string>, Config>>
  options?: Record<string, TSchema>
  arguments?: ArgumentConfig[]
  listArgument?: ListArgumentConfig
  description?: string
  disableHelp?: boolean
}

export type MixConfig<TFrom extends Config, TConfig extends Config> = Prettify<
  TConfig & {
    options: MixOptions<TFrom['options'], TConfig['options']>
  }
>

export type MixOptions<
  PrevOptions extends Config['options'],
  NewOptions extends Config['options']
> = Prettify<
  {
    [Key in keyof PrevOptions as PrevOptions[Key] extends TypeCore<infer Config>
      ? Config extends { global: true }
        ? Key
        : never
      : never]: PrevOptions[Key]
  } & NewOptions
>

type ExtractActionArgs<
  Arguments extends ArgumentConfig[],
  ListArgument extends ListArgumentConfig | undefined
> = [
  ...{
    [Key in keyof Arguments]: Arguments[Key] extends { type: TPrimitive }
      ? ExtractTypeOutput<Arguments[Key]['type']>
      : Arguments[Key] extends { name: string }
      ? string
      : never
  },

  ...(ListArgument extends { type: TPrimitive }
    ? ExtractTypeOutput<ListArgument['type']>[]
    : ListArgument extends { name: string }
    ? string[]
    : [])
]

type MakeObjectOptional<T> = {
  [Key in keyof T as undefined extends T[Key] ? never : Key]: T[Key]
} & {
  [Key in keyof T as undefined extends T[Key] ? Key : never]?: T[Key]
}

type ExtractActionOptions<Options extends Config['options']> = Prettify<
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
>

export type Action<TConfig extends Config> = {
  (
    args: ExtractActionArgs<
      undefined extends TConfig['arguments']
        ? []
        : NonNullable<TConfig['arguments']>,
      TConfig['listArgument']
    >,

    options: ExtractActionOptions<TConfig['options']>,

    config: TConfig
  ): void
}
