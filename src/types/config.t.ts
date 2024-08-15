export type ArgumentConfig = {
  name: string
  type?: TPrimitive
  description?: string
}

export type ListArgumentConfig = ArgumentConfig & {
  minLength?: number
  maxLength?: number
}

export type FlagRecord = {
  raw: string
  key: string | null
  value: string | null
  optionType: 'flag' | 'alias' | null
  hasBooleanEndValue: boolean
}

export type TypeConfig = {
  aliases?: string[]
  description?: string
  required?: boolean
  global?: boolean
  default?: any
  ask?: string
}

export type NoArgOptions = {
  name: string
  programs?: Record<string, NoArg<NoArgOptions>>
  options?: Record<string, TSchema>
  arguments?: ArgumentConfig[]
  optionalArguments?: ArgumentConfig[]
  listArgument?: ListArgumentConfig
  description?: string
}
