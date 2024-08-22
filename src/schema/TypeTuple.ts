import { ResultErr, ResultOk } from './result'
import { TSchemaPrimitive } from './type.t'
import { TypeCore } from './TypeCore'

export class TypeTuple<
  const TConfig extends TypeTuple.Config
> extends TypeCore<TConfig> {
  name = 'tuple' as const

  checkType(value: string[]) {
    if (!Array.isArray(value)) {
      return new ResultErr('Expected a tuple')
    }

    if (value.length !== this.config.schema.length) {
      return new ResultErr(`Expected ${this.config.schema.length} items`)
    }

    const result = value.map((item, i) => this.config.schema[i].checkType(item))
    for (let item of result) {
      if (item instanceof ResultErr) return item
    }

    return new ResultOk((result as ResultOk[]).map((item) => item.value))
  }
}

export module TypeTuple {
  export type Config = TypeCore.Config & { schema: TSchemaPrimitive[] }
  export type Sample = TypeTuple<Config>
}
