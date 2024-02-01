export type Prettify<T extends object> = {
  [Key in keyof T]: T[Key]
} & {}

const aliasRegexp = /^(\-)([^\-])/
const flagRegexp = /^(\-\-)([^\-])/
const optionWithValueRegexp = /^(\-\-?)([^\-]+)\=(?<value>.+)/

export function getFlagInfo(str: string) {
  const isFlag = flagRegexp.test(str)
  const isAlias = aliasRegexp.test(str)
  const isOption = isAlias || isFlag
  const hasValue = isOption && optionWithValueRegexp.test(str)
  const [name, ...value] = str?.split('=') ?? []

  return {
    isFlag,
    isAlias,
    isOption,
    hasValue,

    name,
    value: value.join('='),
    splitted: [name, value.join('=')],
  }
}
