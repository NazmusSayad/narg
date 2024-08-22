import { Prettify } from '../types/util.t'
import { TypeCore } from './TypeCore'
import { ResultErr, ResultOk } from './result'

export class TypeString<
  const TConfig extends TypeString.Config
> extends TypeCore<TConfig> {
  name = 'string' as const

  checkType(value: string) {
    value = value.trim()

    if (this.config.regex && !this.config.regex.test(value)) {
      return new ResultErr(
        `\`${value}\` doesn't match pattern ${this.config.regex}`
      )
    }

    if (this.config.minLength && value.length < this.config.minLength) {
      return new ResultErr(
        `Minimum ${this.config.minLength} characters expected`
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
      this.config.enum.size &&
      !this.config.enum.has(value)
    ) {
      return new ResultErr(`\`${value}\` is not in enum`)
    }

    return new ResultOk(value)
  }

  /**
   * Adds a regex to the string.
   * @param regex The regex to add.
   */
  regex<TRegex extends RegExp>(
    regex: TRegex
  ): TypeString<Prettify<TConfig & { regex: TRegex }>> {
    this.config.regex = regex
    return this as any
  }

  /**
   * Sets the minimum length for the string.
   */
  minLength<TMinLength extends number>(
    minLength: TMinLength
  ): TypeString<Prettify<TConfig & { minLength: TMinLength }>> {
    this.config.minLength = minLength
    return this as any
  }

  /**
   * Sets the maximum length for the string.
   */
  maxLength<TMaxLength extends number>(
    maxLength: TMaxLength
  ): TypeString<Prettify<TConfig & { maxLength: TMaxLength }>> {
    this.config.maxLength = maxLength
    return this as any
  }

  /**
   * Convert to lower or upper case during parsing.
   */
  toCase<TToCase extends 'lower' | 'upper'>(
    toCase: TToCase
  ): TypeString<Prettify<TConfig & { toCase: TToCase }>> {
    this.config.toCase = toCase
    return this as any
  }
}

export module TypeString {
  export type Config = TypeCore.Config &
    Partial<{
      regex: RegExp
      minLength: number
      maxLength: number
      toCase: 'lower' | 'upper'
      enum: Set<string>
    }>
  export type Sample = TypeString<Config>
}
