import {
  TypeArray,
  TypeTuple,
  TypeNumber,
  TypeString,
  TypeBoolean,
} from './index'
import { TPrimitive } from './type.t'

export default {
  string<T extends string[]>(...strings: T) {
    return new TypeString(
      (strings.length ? { enum: strings } : {}) as T extends []
        ? {}
        : { enum: T }
    )
  },

  number<T extends number[]>(...numbers: T) {
    return new TypeNumber(
      (numbers.length ? { enum: numbers } : {}) as T extends []
        ? {}
        : { enum: T }
    )
  },

  boolean() {
    return new TypeBoolean({})
  },

  array<T extends TPrimitive>(schema: T) {
    return new TypeArray({ schema })
  },

  tuple<T extends TPrimitive[]>(...schemas: T) {
    return new TypeTuple({ schemas })
  },
}
