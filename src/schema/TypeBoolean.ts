import { ResultErr, ResultOk } from './result'
import TypeCore, { TypeCoreConfig } from './TypeCore'

export type TypeBooleanConfig = TypeCoreConfig & Partial<{}>

export class TypeBoolean<
  const TConfig extends TypeBooleanConfig
> extends TypeCore<TConfig> {
  name = 'boolean' as const

  checkType(value: string) {
    value = value.trim().toLowerCase()

    if (value === 'true' || value === 'yes') return new ResultOk(true)
    if (value === 'false' || value === 'no') return new ResultOk(false)
    return new ResultErr(`\`${value}\` is not a valid boolean`)
  }
}
