import TypeArray, { TypeArrayConfig } from './TypeArray'
import { TypeBoolean, TypeBooleanConfig } from './TypeBoolean'
import { TypeCoreConfig } from './TypeCore'
import TypeNumber, { TypeNumberConfig } from './TypeNumber'
import TypeString, { TypeStringConfig } from './TypeString'
import TypeTuple, { TypeTupleConfig } from './TypeTuple'

export type CombineConfig<T, U> = T & {
  config: TypeCoreConfig & U
}

export type ParsedResult<T, U> =
  | { value: T; error: null; valid: true }
  | { value: null; error: U; valid: false }

export type TSchemaPrimitive =
  | TypeString<TypeStringConfig>
  | TypeNumber<TypeNumberConfig>
  | TypeBoolean<TypeBooleanConfig>

export type TSchemaList =
  | TypeArray<TypeArrayConfig>
  | TypeTuple<TypeTupleConfig>

export type TSchema = TSchemaPrimitive | TSchemaList

export type InferAndUpdateConfig<T, NConf> = T extends TypeString<infer TConf>
  ? TypeString<NConf extends TConf ? NConf : never>
  : T extends TypeNumber<infer TConf>
  ? TypeNumber<NConf extends TConf ? NConf : never>
  : T extends TypeBoolean<infer TConf>
  ? TypeBoolean<NConf extends TConf ? NConf : never>
  : T extends TypeArray<infer TConf>
  ? TypeArray<NConf extends TConf ? NConf : never>
  : T extends TypeTuple<infer TConf>
  ? TypeTuple<NConf extends TConf ? NConf : never>
  : never

export type ExtractTypeTupleCore<T extends TSchemaPrimitive[]> = {
  [K in keyof T]: K extends `${number}`
    ? Exclude<ExtractTypeOutput<T[K]>, undefined>
    : T[K]
}

export type ExtractTypeUndefined<T extends TypeCoreConfig> = T extends {
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
    ? Config['enum'] extends Set<infer TStrEnum>
      ? TStrEnum
      : string
    : // Extract Number
    T extends TypeNumber<infer Config>
    ? Config['enum'] extends Set<infer TStrNum>
      ? TStrNum
      : number
    : // Extract Boolean
    T extends TypeBoolean<infer Config>
    ? boolean
    : // Extract Array
    T extends TypeArray<infer Config>
    ? Config['schema'] extends TSchemaPrimitive
      ? Exclude<ExtractTypeOutput<Config['schema']>, undefined>[]
      : never
    : // Extract Tuple
    T extends TypeTuple<infer Config>
    ? ExtractTypeTupleCore<Config['schema']>
    : never
