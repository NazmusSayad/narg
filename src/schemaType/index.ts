import { TypeConfig } from '../config'
import { Prettify } from '../utils'
import { ResultErr, ResultOk } from './result'
import { ExtractTypeOutput, InferTypeAndUpdate, TPrimitive } from './type.t'

type ParsedResult<T, U> = [T, null, true] | [null, U, false]
export class TypeCore<TConfig extends TypeConfig> {
  name = 'core'
  constructor(public config: TConfig) {}

  parse<SELF = typeof this>(
    value?: string | string[]
  ): ParsedResult<ExtractTypeOutput<SELF>, string> {
    const result = this.checkType(value)
    if (result instanceof ResultErr) return [null, result.message, false]
    return [result.value, null, true]
  }

  checkType(value: unknown): ResultOk | ResultErr {
    return new ResultErr("This type doesn't have a checkType method")
  }

  default<TDefault extends ExtractTypeOutput<SELF>, SELF = typeof this>(
    value: TDefault
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { default: TDefault }>> {
    this.config.default = value
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

export class TypeString<
  const TConfig extends Partial<
    TypeConfig & {
      regex: RegExp
      minLength: number
      maxLength: number
      toCase: 'lower' | 'upper'
      enum: string[]
    }
  >
> extends TypeCore<TConfig> {
  name = 'string' as const

  checkType(value: string) {
    value = value.trim()

    if (this.config.regex && !this.config.regex.test(value)) {
      return new ResultErr(`${value} doesn't match regex}`)
    }

    if (this.config.minLength && value.length < this.config.minLength) {
      return new ResultErr(
        ` Minimum ${this.config.minLength} characters expected`
      )
    }

    if (this.config.maxLength && value.length > this.config.maxLength) {
      return new ResultErr(
        `Maximum ${this.config.maxLength} characters expected`
      )
    }

    if (this.config.toCase === 'lower') value = value.toLowerCase()
    if (this.config.toCase === 'upper') value = value.toUpperCase()

    if (
      this.config.enum &&
      this.config.enum.length &&
      !this.config.enum.includes(value)
    ) {
      return new ResultErr(`"${value}" is not in enum`)
    }

    return new ResultOk(value)
  }

  regex<TRegex extends RegExp, SELF = typeof this>(
    regex: TRegex
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { regex: TRegex }>> {
    this.config.regex = regex
    return this as any
  }

  minLength<TMinLength extends number, SELF = typeof this>(
    minLength: TMinLength
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { minLength: TMinLength }>> {
    this.config.minLength = minLength
    return this as any
  }

  maxLength<TMaxLength extends number, SELF = typeof this>(
    maxLength: TMaxLength
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { maxLength: TMaxLength }>> {
    this.config.maxLength = maxLength
    return this as any
  }

  toCase<TToCase extends 'lower' | 'upper', SELF = typeof this>(
    toCase: TToCase
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { toCase: TToCase }>> {
    this.config.toCase = toCase
    return this as any
  }
}

export class TypeNumber<
  const TConfig extends Partial<
    TypeConfig & {
      min: number
      max: number
      enum: number[]
      toInteger: boolean
    }
  >
> extends TypeCore<TConfig> {
  name = 'number' as const

  checkType(value: string) {
    const number = Number(value.trim())

    if (isNaN(number)) return new ResultErr(`"${value}" is not a valid number`)

    if (this.config.min && number < this.config.min) {
      return new ResultErr(`Minimum ${this.config.min} characters expected`)
    }

    if (this.config.max && number > this.config.max) {
      return new ResultErr(`Maximum ${this.config.max} characters expected`)
    }

    if (
      this.config.enum &&
      this.config.enum.length &&
      !this.config.enum.includes(number)
    ) {
      return new ResultErr(`"${number}" is not in enum`)
    }

    return new ResultOk(this.config.toInteger ? Math.floor(number) : number)
  }

  min<TMin extends number, SELF = typeof this>(
    min: TMin
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { min: TMin }>> {
    this.config.min = min
    return this as any
  }

  max<TMax extends number, SELF = typeof this>(
    max: TMax
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { max: TMax }>> {
    this.config.max = max
    return this as any
  }

  toInteger<SELF = typeof this>(): InferTypeAndUpdate<
    SELF,
    Prettify<TConfig & { toInteger: true }>
  > {
    this.config.toInteger = true
    return this as any
  }
}

export class TypeBoolean<
  const TConfig extends Partial<TypeConfig>
> extends TypeCore<TConfig> {
  name = 'boolean' as const

  checkType(value: string) {
    value = value.trim().toLowerCase()

    if (value === 'true' || value === 'yes') return new ResultOk(true)
    if (value === 'false' || value === 'no') return new ResultOk(false)
    return new ResultErr(`"${value}" is not a valid boolean`)
  }
}

export class TypeArray<
  const TConfig extends Prettify<
    Partial<TypeConfig & { minLength: number; maxLength: number }> & {
      schema: TPrimitive
    }
  >
> extends TypeCore<TConfig> {
  name = 'array' as const

  checkType(value: string[]) {
    if (this.config.minLength && value.length < this.config.minLength) {
      return new ResultErr(`Minimum ${this.config.minLength} items expected`)
    }
    if (this.config.maxLength && value.length > this.config.maxLength) {
      return new ResultErr(`Maximum ${this.config.maxLength} items expected`)
    }

    const result = value.map((item) => this.config.schema.checkType(item))
    for (let item of result) {
      if (item instanceof ResultErr) return item
    }

    return new ResultOk((result as ResultOk[]).map((item) => item.value))
  }

  minLength<TMinLength extends number, SELF = typeof this>(
    minLength: TMinLength
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { minLength: TMinLength }>> {
    this.config.minLength = minLength
    return this as any
  }

  maxLength<TMaxLength extends number, SELF = typeof this>(
    maxLength: TMaxLength
  ): InferTypeAndUpdate<SELF, Prettify<TConfig & { maxLength: TMaxLength }>> {
    this.config.maxLength = maxLength
    return this as any
  }
}

export class TypeTuple<
  const TConfig extends Prettify<
    Partial<TypeConfig> & { schemas: TPrimitive[] }
  >
> extends TypeCore<TConfig> {
  name = 'tuple' as const

  checkType(value: string[]) {
    if (value.length !== this.config.schemas.length)
      return new ResultErr(`Expected ${this.config.schemas.length} items`)

    const result = value.map((item, i) =>
      this.config.schemas[i].checkType(item)
    )
    for (let item of result) {
      if (item instanceof ResultErr) return item
    }

    return new ResultOk((result as ResultOk[]).map((item) => item.value))
  }
}
