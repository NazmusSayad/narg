import { MergeObject, Prettify } from '../types/util.t'
import { ResultErr, ResultOk } from './result'
import verifyOptionName from '../helpers/validate-flag-name'
import { ParsedResult, ExtractTypeOutput, InferAndUpdateConfig } from './type.t'

export class TypeCore<TConfig extends TypeCore.Config> {
  name = 'core'
  constructor(public config: TConfig) {}

  parse<SELF = typeof this>(
    value?: string | string[]
  ): ParsedResult<ExtractTypeOutput<SELF>, string> {
    const result = this.checkType(value)
    if (result instanceof ResultErr) {
      return { value: null, error: result.message, valid: false }
    }
    return { value: result.value, error: null, valid: true }
  }

  protected checkType(_: unknown): ResultOk | ResultErr {
    return new ResultErr("This type doesn't have a checkType method")
  }

  /**
   * ### ⚠️ When using both `default` and `ask`, you will still be prompted for a value.
   * Sets a default value and marks the option as required.
   * @param value The default value to set.
   */
  default<TDefault extends ExtractTypeOutput<SELF>, SELF = typeof this>(
    value: TDefault
  ): InferAndUpdateConfig<
    SELF,
    Prettify<MergeObject<TConfig, { default: TDefault; required: true }>>
  > {
    this.config.required = true
    this.config.default = value
    return this as any
  }

  /**
   * ### ⚠️ When using both `default` and `ask`, you will still be prompted for a value.
   * Asks the user for a value if one is not provided.
   * @param askQuestion The question to ask the user.
   */
  ask<TDefault extends string, SELF = typeof this>(
    askQuestion?: TDefault
  ): InferAndUpdateConfig<
    SELF,
    Prettify<MergeObject<TConfig, { askQuestion: TDefault; required: true }>>
  > {
    this.config.required = true
    this.config.askQuestion = askQuestion ?? 'Enter a value:'
    return this as any
  }

  /**
   * ### ⚠️ Only works for flags.
   * Sets the aliases for the option.
   * @param aliases The aliases to set.
   */
  aliases<TAliases extends string[], SELF = typeof this>(
    ...aliases: TAliases
  ): InferAndUpdateConfig<
    SELF,
    Prettify<MergeObject<TConfig, { aliases: TAliases }>>
  > {
    aliases.forEach((alias) => {
      verifyOptionName('Alias', alias)
    })

    this.config.aliases = [...new Set(aliases)].sort(
      (a, b) => a.length - b.length
    )

    return this as any
  }

  /**
   * ### ⚠️ Only works for flags.
   * Marks the option as required.
   */
  required<SELF = typeof this>(): InferAndUpdateConfig<
    SELF,
    Prettify<MergeObject<TConfig, { required: true }>>
  > {
    this.config.required = true
    return this as any
  }

  /**
   * ### ⚠️ Only works for flags.
   * Sets the description for the option.
   */
  description<TDescription extends string, SELF = typeof this>(
    description: TDescription
  ): InferAndUpdateConfig<
    SELF,
    Prettify<MergeObject<TConfig, { description: TDescription }>>
  > {
    this.config.description = description
    return this as any
  }
}

export module TypeCore {
  export type Config = Partial<{
    aliases: string[]
    description: string
    required: boolean
    default: any
    askQuestion: string
  }>

  export type Sample = TypeCore<Config>
}
