import { TypeCore } from './TypeCore'
import { TypeString } from './TypeString'
import { Prettify } from '../types/util.t'
import { TSchemaPrimitive } from './type.t'
import { ResultErr, ResultOk } from './result'

export class TypeArray<
  const TConfig extends TypeArray.Config
> extends TypeCore<TConfig> {
  name = 'array' as const

  protected checkType(value: string[]) {
    if (!Array.isArray(value)) {
      return new ResultErr('Expected an array of ' + this.config.schema.name)
    }
    if (this.config.minLength && value.length < this.config.minLength) {
      return new ResultErr(`Minimum ${this.config.minLength} items expected`)
    }
    if (this.config.maxLength && value.length > this.config.maxLength) {
      return new ResultErr(`Maximum ${this.config.maxLength} items expected`)
    }

    const result = value.map((item) => {
      const schema = this.config.schema as TypeString.Sample
      return schema['checkType'](item)
    })

    for (let item of result) {
      if (item instanceof ResultErr) return item
    }

    return new ResultOk((result as ResultOk[]).map((item) => item.value))
  }

  /**
   * Sets the minimum length constraint for the array.
   */
  minLength<TMinLength extends number>(
    minLength: TMinLength
  ): TypeArray<Prettify<TConfig & { minLength: TMinLength }>> {
    this.config.minLength = minLength
    return this as any
  }

  /**
   * Sets the maximum length constraint for the array.
   */
  maxLength<TMaxLength extends number>(
    maxLength: TMaxLength
  ): TypeArray<Prettify<TConfig & { maxLength: TMaxLength }>> {
    this.config.maxLength = maxLength
    return this as any
  }
}

export module TypeArray {
  export type Config = TypeCore.Config &
    Partial<{
      minLength: number
      maxLength: number
    }> & { schema: TSchemaPrimitive }

  export type Sample = TypeArray<Config>
}
