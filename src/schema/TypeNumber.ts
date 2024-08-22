import { Prettify } from '../types/util.t'
import { ResultErr, ResultOk } from './result'
import { TypeCore } from './TypeCore'

export class TypeNumber<
  const TConfig extends TypeNumber.Config
> extends TypeCore<TConfig> {
  name = 'number' as const

  checkType(value: string | number) {
    if (value === '') return new ResultErr(`Number can not be empty string`)

    const number = typeof value === 'string' ? Number(value) : value

    if (isNaN(number))
      return new ResultErr(`\`${value}\` is not a valid number`)

    if (this.config.min && number < this.config.min) {
      return new ResultErr(`Number must be at least ${this.config.min}`)
    }

    if (this.config.max && number > this.config.max) {
      return new ResultErr(`Number must be at most ${this.config.max}`)
    }

    if (
      this.config.enum &&
      this.config.enum.size &&
      !this.config.enum.has(number)
    ) {
      return new ResultErr(`\`${number}\` is not in enum`)
    }

    return new ResultOk(this.config.toInteger ? Math.floor(number) : number)
  }

  /**
   * Adds a minimum value to the number.
   */
  min<TMin extends number>(
    min: TMin
  ): TypeNumber<Prettify<TConfig & { min: TMin }>> {
    this.config.min = min
    return this as any
  }

  /**
   * Adds a maximum value to the number.
   */
  max<TMax extends number>(
    max: TMax
  ): TypeNumber<Prettify<TConfig & { max: TMax }>> {
    this.config.max = max
    return this as any
  }

  /**
   * Converts the number to an integer during parsing.
   */
  toInteger(): TypeNumber<Prettify<TConfig & { toInteger: true }>> {
    this.config.toInteger = true
    return this as any
  }
}

export module TypeNumber {
  export type Config = TypeCore.Config &
    Partial<{
      min: number
      max: number
      enum: Set<number>
      toInteger: boolean
    }>
  export type Sample = TypeNumber<Config>
}
