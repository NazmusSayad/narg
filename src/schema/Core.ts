import { ParsedResult, ExtractTypeOutput, InferTypeAndUpdate } from './types.t'
import { Prettify } from '../types/util.t'
import { ResultErr, ResultOk } from './result'
import verifyOptionName from '../helpers/verify-option-name'

export type TypeCoreConfig = {
  aliases?: string[]
  description?: string
  required?: boolean
  global?: boolean
  default?: any
  ask?: string
}

export class TypeCore<TConfig extends TypeCoreConfig> {
  name = 'core'
  constructor(public config: TConfig) {}

  parse<SELF = typeof this>(
    value?: string | string[]
  ): ParsedResult<ExtractTypeOutput<SELF>, string> {
    const result = this.checkType(value)
    if (result instanceof ResultErr) return [null, result.message, false]
    return [result.value, null, true]
  }

  checkType(_value: unknown): ResultOk | ResultErr {
    return new ResultErr("This type doesn't have a checkType method")
  }

  default<TDefault extends ExtractTypeOutput<SELF>, SELF = typeof this>(
    value: TDefault
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { default: TDefault }>> {
    this.config.default = value
    return this as any
  }

  ask<TDefault extends string, SELF = typeof this>(
    question?: TDefault
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { ask: TDefault }>> {
    this.config.ask = question ?? 'Enter a value:'
    return this as any
  }

  global<SELF = typeof this>(): InferTypeAndUpdate<
    SELF,
    Prettify<TConfig & { global: true }>
  > {
    this.config.global = true
    return this as any
  }

  aliases<TAliases extends string[], SELF = typeof this>(
    ...aliases: TAliases
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { aliases: TAliases }>> {
    aliases.forEach((alias) => {
      verifyOptionName('Alias', alias)
    })

    this.config.aliases = [...new Set(aliases)].sort(
      (a, b) => a.length - b.length
    )

    return this as any
  }

  required<SELF = typeof this>(): InferTypeAndUpdate<
    SELF,
    Prettify<TConfig & { required: true }>
  > {
    this.config.required = true
    return this as any
  }

  description<TDescription extends string, SELF = typeof this>(
    description: TDescription
  ): InferTypeAndUpdate<
    SELF,
    Prettify<TConfig & { description: TDescription }>
  > {
    this.config.description = description
    return this as any
  }
}
