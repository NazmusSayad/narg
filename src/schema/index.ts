import { TSchemaPrimitive } from './type.t'
import { TypeBoolean } from './TypeBoolean'
import { TypeNumber } from './TypeNumber'
import { TypeString } from './TypeString'
import { TypeArray } from './TypeArray'
import { TypeTuple } from './TypeTuple'

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

  /**
   * ### ⚠️ Only available for flags.
   */
  array<T extends TSchemaPrimitive>(schema: T) {
    delete schema.config.aliases
    delete schema.config.default
    delete schema.config.required
    delete schema.config.askQuestion
    delete schema.config.description

    const config = { schema }
    return new TypeArray(config)
  },

  /**
   * ### ⚠️ Only available for flags.
   */
  tuple<T extends TSchemaPrimitive[]>(...schema: T) {
    const config = {
      schema: schema.map((s) => {
        s.config.required = true
        delete s.config.aliases
        delete s.config.askQuestion
        delete s.config.description

        return s
      }),
    }
    return new TypeTuple(config)
  },
}
