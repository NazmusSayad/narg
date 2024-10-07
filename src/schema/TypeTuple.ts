import { TypeCore } from './TypeCore'
import { TypeString } from './TypeString'
import { TSchemaPrimitive } from './type.t'
import { ResultErr, ResultOk } from './result'

export class TypeTuple<
  const TConfig extends TypeTuple.Config
> extends TypeCore<TConfig> {
  name = 'tuple' as const

  protected checkType(value: string[]) {
    if (!Array.isArray(value)) {
      return new ResultErr('Expected a tuple')
    }

    if (value.length !== this.config.schema.length) {
      return new ResultErr(`Expected ${this.config.schema.length} items`)
    }

    const result = value.map((item, i) => {
      const schema = this.config.schema[i] as TypeString.Sample
      return schema['checkType'](item)
    })

    for (let item of result) {
      if (item instanceof ResultErr) return item
    }

    return new ResultOk((result as ResultOk[]).map((item) => item.value))
  }
}

export namespace TypeTuple {
  export type Config = TypeCore.Config & { schema: TSchemaPrimitive[] }
  export type Sample = TypeTuple<Config>
}
