import { TSchemaPrimitive } from './type.t'
import TypeArray from './TypeArray'
import { TypeBoolean } from './TypeBoolean'
import TypeNumber from './TypeNumber'
import TypeString from './TypeString'
import TypeTuple from './TypeTuple'

export default {
  string<const T extends string[]>(...strings: T) {
    const config = {} as any
    if (strings.length) {
      config.enum = new Set(strings)
    }

    return new TypeString(
      config as T extends [] ? {} : { enum: Set<T[number]> }
    )
  },

  number<const T extends number[]>(...numbers: T) {
    const config = {} as any
    if (numbers.length) {
      config.enum = new Set(numbers)
    }

    return new TypeNumber(
      config as T extends [] ? {} : { enum: Set<T[number]> }
    )
  },

  boolean() {
    return new TypeBoolean({})
  },

  array<T extends TSchemaPrimitive>(schema: T) {
    const config = { schema }
    return new TypeArray(config)
  },

  tuple<T extends TSchemaPrimitive[]>(...schema: T) {
    const config = { schema }
    return new TypeTuple(config)
  },
}
