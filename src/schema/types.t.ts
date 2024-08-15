import {
  TypeArray,
  TypeTuple,
  TypeNumber,
  TypeString,
  TypeBoolean,
} from './index'
import { TypeCoreConfig } from './Core'

export type ParsedResult<T, U> = [T, null, true] | [null, U, false]

export type TPrimitive =
  | TypeString<TypeCoreConfig & Record<string, unknown>>
  | TypeNumber<TypeCoreConfig & Record<string, unknown>>
  | TypeBoolean<TypeCoreConfig & Record<string, unknown>>

export type TSchema =
  | TPrimitive
  | TypeArray<TypeCoreConfig & { schema: TPrimitive } & Record<string, unknown>>
  | TypeTuple<
      TypeCoreConfig & { schemas: TPrimitive[] } & Record<string, unknown>
    >

export type InferTypeAndUpdate<T, TConfig> = T extends TypeString<infer Config>
  ? TypeString<TConfig extends Config ? TConfig : never>
  : T extends TypeNumber<infer Config>
  ? TypeNumber<TConfig extends Config ? TConfig : never>
  : T extends TypeBoolean<infer Config>
  ? TypeBoolean<TConfig extends Config ? TConfig : never>
  : T extends TypeArray<infer Config>
  ? TypeArray<TConfig extends Config ? TConfig : never>
  : T extends TypeTuple<infer Config>
  ? TypeTuple<TConfig extends Config ? TConfig : never>
  : never

export type ExtractTypeTupleCore<T extends TPrimitive[]> = {
  [K in keyof T]: K extends `${number}`
    ? Exclude<ExtractTypeOutput<T[K]>, undefined>
    : T[K]
}

export type CheckUndefined<T extends TypeCoreConfig> = T extends {
  required: true
}
  ? never
  : T extends { default: infer U }
  ? U extends undefined
    ? undefined
    : never
  : T extends { ask: infer U }
  ? U extends undefined
    ? undefined
    : never
  : undefined

export type ExtractTypeOutput<T> =
  // Extract String
  T extends TypeString<infer Config>
    ? Config['enum'] extends string[]
      ? Config['enum'][number]
      : string
    : // Extract Number
    T extends TypeNumber<infer Config>
    ? Config['enum'] extends number[]
      ? Config['enum'][number]
      : number
    : // Extract Boolean
    T extends TypeBoolean<infer Config>
    ? boolean
    : // Extract Array
    T extends TypeArray<infer Config>
    ? Config['schema'] extends TPrimitive
      ? Exclude<ExtractTypeOutput<Config['schema']>, undefined>[]
      : never
    : // Extract Tuple
    T extends TypeTuple<infer Config>
    ? ExtractTypeTupleCore<Config['schemas']>
    : never
