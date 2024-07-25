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
}

export type NoArgOptions = {
  name: string
  programs?: Record<string, NoArg<NoArgOptions>>
  options?: Record<string, TSchema>
  arguments?: ArgumentConfig[]
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
  TConfig extends Pick<NoArgOptions, 'arguments' | 'options' | 'listArgument'>
> = {
  (
    args: ExtractActionArgs<
      undefined extends TConfig['arguments']
        ? []
        : NonNullable<TConfig['arguments']>,
      TConfig['listArgument']
    >,

    options: ExtractActionOptions<TConfig['options']>
  ): void
}
