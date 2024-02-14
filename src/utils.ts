export type Prettify<T extends object> = {
  [Key in keyof T]: T[Key]
} & {}

const aliasRegexp = /^(\-)([^\-])/
const flagRegexp = /^(\-\-)([^\-])/
const optionWithValueRegexp = /^(?<key>[^\=]+)\=(?<value>.+)/

export function getFlagInfo(arg: string) {
  const isFlag = flagRegexp.test(arg)
  const isAlias = aliasRegexp.test(arg)
  const optionType = isFlag
    ? ('flag' as const)
    : isAlias
    ? ('alias' as const)
    : null

  let key = isFlag ? arg.slice(2) : isAlias ? arg.slice(1) : null
  let value = null
  let hasBooleanEndValue = false

  if (key) {
    const hasValue = optionWithValueRegexp.test(key)

    if (hasValue) {
      const { value: _value = null, key: _key = null } =
        key.match(optionWithValueRegexp)?.groups ?? {}

      key = _key
      value = _value
    } else if (key.endsWith('!')) {
      key = key.slice(0, -1)
      hasBooleanEndValue = true
    }
  }

  return {
    raw: arg,

    key,
    value,
    optionType,
    hasBooleanEndValue,
  }
}
