import { ResultErr, ResultOk } from './result'
import { TSchemaPrimitive } from './type.t'
import TypeCore, { TypeCoreConfig } from './TypeCore'

export type TypeTupleConfig = TypeCoreConfig & {
  schema: TSchemaPrimitive[]
}

export default class TypeTuple<
  const TConfig extends TypeTupleConfig
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
