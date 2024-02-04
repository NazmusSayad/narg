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

  const key = isFlag ? arg.slice(2) : isAlias ? arg.slice(1) : null
  const hasValue = key && optionWithValueRegexp.test(key)
  const value = hasValue
    ? arg.match(optionWithValueRegexp)?.groups?.value ?? null
    : null

  return {
    raw: arg,
    optionType,
    value,
    key: hasValue ? key.match(optionWithValueRegexp)?.groups?.key ?? null : key,
  }
}
