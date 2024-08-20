import { Prettify } from '../types/util.t'
import { ResultErr, ResultOk } from './result'
import TypeCore, { TypeCoreConfig } from './TypeCore'

export type TypeNumberConfig = TypeCoreConfig &
  Partial<{
    min: number
    max: number
    enum: Set<number>
    toInteger: boolean
  }>
export default class TypeNumber<
  const TConfig extends TypeNumberConfig
> extends TypeCore<TConfig> {
  name = 'number' as const

  checkType(value: string) {
    if (value === '') return new ResultErr(`Number can not be empty string`)

    const number = Number(value.trim())

    if (isNaN(number)) return new ResultErr(`\`${value}\` is not a valid number`)

    if (this.config.min && number < this.config.min) {
      return new ResultErr(`Minimum ${this.config.min} characters expected`)
    }

    if (this.config.max && number > this.config.max) {
      return new ResultErr(`Maximum ${this.config.max} characters expected`)
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

  min<TMin extends number>(
    min: TMin
  ): TypeNumber<Prettify<TConfig & { min: TMin }>> {
    this.config.min = min
    return this as any
  }

  max<TMax extends number>(
    max: TMax
  ): TypeNumber<Prettify<TConfig & { max: TMax }>> {
    this.config.max = max
    return this as any
  }

  toInteger(): TypeNumber<Prettify<TConfig & { toInteger: true }>> {
    this.config.toInteger = true
    return this as any
  }
}
