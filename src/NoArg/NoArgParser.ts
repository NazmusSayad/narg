import colors from '../lib/colors'
import askCli from '../helpers/ask-cli'
import { NoArgCore } from './NoArgCore'
import { NoArgError } from './NoArgError'
import { TSchema } from '../schema/type.t'
import { TypeTuple } from '../schema/TypeTuple'
import { TypeArray } from '../schema/TypeArray'
import type { NoArgProgram } from './NoArgProgram'
import { TypeBoolean } from '../schema/TypeBoolean'
import splitTrailingArgs from '../utils/split-trailing-args'

export class NoArgParser<
  TName extends string,
  TSystem extends NoArgCore.System,
  TConfig extends NoArgCore.Config,
  TOptions extends NoArgCore.Options
> extends NoArgCore<TName, TSystem, TConfig, TOptions> {
  private browsePrograms([name, ...args]: string[]) {
    const program = this.programs.get(name)
    if (program) {
      program['startCore'](args)
      return true
    }
  }

  private divideArguments(args: string[]) {
    const mainArgs = []
    const trailingArgs = []

    if (this.config.enableTrailingArgs) {
      const [main, trailing] = splitTrailingArgs(
        args,
        this.config.trailingArgsSeparator
      )

      mainArgs.push(...main)
      trailingArgs.push(...trailing)
    } else {
      mainArgs.push(...args)
    }

    let isOptionReached = false
    const argList: string[] = []
    const options: NoArgParser.ParsedFlagRecord[] = []

    for (let arg of mainArgs) {
      const result = this.getFlagMetadata(arg)

      if (
        !isOptionReached &&
        (result.argType === 'flag' || result.argType === 'alias')
      ) {
        isOptionReached = true
      }

      if (!isOptionReached) {
        argList.push(arg)
        continue
      }

      options.push(result)
    }

    return [argList, options, trailingArgs] as const
  }

  private findFlagInSchema(record: NoArgParser.ParsedFlagRecord) {
    const combinedFlags = { ...this.options.globalFlags, ...this.options.flags }

    if (record.argType === 'flag') {
      const schema = combinedFlags[record.key!]
      if (schema) return { schemaKey: record.key!, schema }
    }

    if (record.argType === 'alias') {
      const found = Object.entries(combinedFlags).find(([, schema]) => {
        return schema.config.aliases?.includes(record.key!)
      })

      if (found) return { schemaKey: found[0], schema: found[1] }
    }

    throw new NoArgError(`Unknown option ${colors.red(record.arg)} entered`)
  }

  private getFlagMetadata(rawArg: string): NoArgParser.ParsedFlagRecord {
    const isFlag = NoArgParser.flagRegex.test(rawArg)
    const isAlias = NoArgParser.flagAliasRegex.test(rawArg)
    const argType = isFlag
      ? ('flag' as const)
      : isAlias
      ? ('alias' as const)
      : 'value'

    let key = isFlag ? rawArg.slice(2) : isAlias ? rawArg.slice(1) : null
    let value = null
    let hasBooleanEndValue

    if (key) {
      const hasValue = NoArgParser.optionWithValueRegex.test(key)

      if (hasValue) {
        if (!this.system.allowEqualAssign) {
          throw new NoArgError(
            `Equal assignment is not allowed ${colors.red(rawArg)}`
          )
        }

        const { value: _value = null, key: _key = null } =
          key.match(NoArgParser.optionWithValueRegex)?.groups ?? {}

        key = _key
        value = _value
      } else if (
        this.system.booleanNotSyntaxEnding &&
        key.endsWith(this.system.booleanNotSyntaxEnding)
      ) {
        key = key.slice(0, -this.system.booleanNotSyntaxEnding.length)
        hasBooleanEndValue = true
      }
    } else {
      value = rawArg
    }

    return {
      arg: rawArg,
      key,
      value,
      argType,
      hasBooleanEndValue,
    } as NoArgParser.ParsedFlagRecord
  }

  private checkRecordFactory(
    output: Record<string, NoArgParser.ParsedFlagWithSchema>
  ) {
    let mustHaveAnyValue = false
    let prevSchemaKeyRecord: NoArgParser.ParsedFlagRecord & {
      schemaKey: string
      schema: TSchema
    }

    const handleDuplicateValue = (
      record: NoArgParser.ParsedFlagRecord,
      schemaKey: string
    ) => {
      const outputRecord = output[schemaKey]

      if (
        outputRecord.schema instanceof TypeArray ||
        outputRecord.schema instanceof TypeTuple
      ) {
        if (this.system.allowDuplicateFlagForList) {
          if (!this.system.overwriteDuplicateFlagForList) return
          return (outputRecord.values = [])
        }
      } else {
        if (this.system.allowDuplicateFlagForPrimitive) {
          return (outputRecord.values.length = 0)
        }
      }

      throw new NoArgError(
        `Duplicate option ${colors.cyan(record.arg!)} entered`
      )
    }

    const handleBooleanEndValue = (
      record: NoArgParser.ParsedFlagRecord,
      schema: TSchema
    ) => {
      if (schema instanceof TypeBoolean) record.value = 'false'
      else {
        throw new NoArgError(
          `Only boolean types accept \`${
            this.system.booleanNotSyntaxEnding
          }\` assignment for option: ${colors.red(record.arg)}`
        )
      }
    }

    const handleMustHaveValueRecord = () => {
      const outputRecord = output[prevSchemaKeyRecord.schemaKey]
      if (prevSchemaKeyRecord.schema instanceof TypeBoolean) {
        outputRecord.values.push('true')
        return (mustHaveAnyValue = false)
      }

      throw new NoArgError(
        `No value given for option: ${colors.red(prevSchemaKeyRecord.arg)}`
      )
    }

    return (record: NoArgParser.ParsedFlagRecord) => {
      if (record.argType === 'flag' || record.argType === 'alias') {
        const { schemaKey, schema } = this.findFlagInSchema(record)

        if (mustHaveAnyValue) handleMustHaveValueRecord()
        if (schemaKey in output) handleDuplicateValue(record, schemaKey)
        if (record.hasBooleanEndValue) handleBooleanEndValue(record, schema)

        output[schemaKey] ??= {
          argType: record.argType,
          arg: record.arg,
          schema: schema,
          values: [],
        }

        if (record.value !== null) {
          output[schemaKey].values.push(record.value)
        } else {
          mustHaveAnyValue = true
        }

        return (prevSchemaKeyRecord = { ...record, schemaKey, schema })
      }

      if (record.argType === 'value') {
        mustHaveAnyValue = false
        return output[prevSchemaKeyRecord.schemaKey].values.push(record.value)
      }

      throw new NoArgError(
        colors.red('Something went very very wrong, please report this issue')
      )
    }
  }

  private parseFlagsCore(records: NoArgParser.ParsedFlagRecord[]) {
    if (records.length === 0) return {}
    if (records[0].argType === 'value') {
      throw new NoArgError(
        `Received a value: ${colors.yellow(
          records[0].arg
        )}. Expected an option.` +
          '\n But this should never be happened. Please report this issue.'
      )
    }

    const output = {} as Record<string, NoArgParser.ParsedFlagWithSchema>
    const next = this.checkRecordFactory(output)
    records.forEach(next)
    return output
  }

  private async parseArguments(args: string[]) {
    args = [...args]
    this.options.arguments ??= []
    this.options.optionalArguments ??= []
    type ArgsOutputType = (string | number | boolean)[]

    const resultArgs: ArgsOutputType = []
    for (const config of this.options.arguments) {
      const input = args.shift()

      if (!input) {
        if (config.type.config.askQuestion === undefined) {
          throw new NoArgError(
            `No value provided for argument: ${colors.blue(config.name)}`
          )
        }

        const result = await askCli(config.type, colors.blue(config.name) + ':')

        resultArgs.push(result as ArgsOutputType[number])
        continue
      }

      if (!config.type) {
        resultArgs.push(input)
        continue
      }

      const { value, error, valid } = config.type.parse(input)
      if (valid) {
        resultArgs.push(value)
        continue
      }

      throw new NoArgError(`${error} for argument: ${colors.blue(config.name)}`)
    }

    const resultOptArgs: ArgsOutputType = []
    for (const config of this.options.optionalArguments) {
      if (args.length === 0) break
      const input = args.shift()!

      if (!config.type) {
        resultOptArgs.push(input)
        continue
      }

      const { value, error, valid } = config.type.parse(input)
      if (valid) {
        resultOptArgs.push(value)
        continue
      }

      throw new NoArgError(`${error} for argument: ${colors.blue(config.name)}`)
    }

    const resultListArg: any[] = []
    if (this.options.listArgument) {
      const arraySchema = new TypeArray({
        schema: this.options.listArgument.type,
        minLength: this.options.listArgument.minLength,
        maxLength: this.options.listArgument.maxLength,
      })

      const { value, error, valid } = arraySchema.parse(args)

      if (valid) {
        resultListArg.push(...value)
        args.length = 0
      } else {
        throw new NoArgError(
          `${error} for list argument: ${colors.blue(
            this.options.listArgument.name
          )}`
        )
      }
    }

    if (args.length > 0) {
      throw new NoArgError(
        `Unexpected arguments: ${colors.green(args.join(' '))}`
      )
    }

    return {
      resultArgs,
      resultOptArgs,
      resultListArg,
    }
  }

  private async parseFlags(records: NoArgParser.ParsedFlagRecord[]) {
    const flagsRecordWithSchema = this.parseFlagsCore(records)
    const output: Record<string, any> = {}

    for (const key in flagsRecordWithSchema) {
      const argValue = flagsRecordWithSchema[key]

      if (argValue.values.length === 0) {
        if (argValue.schema instanceof TypeBoolean) {
          output[key] = true
          continue
        }

        throw new NoArgError(
          `No value given for option: ${colors.red(argValue.arg)}`
        )
      }

      const isList =
        argValue.schema instanceof TypeArray ||
        argValue.schema instanceof TypeTuple

      if (isList && this.system.splitListByComma) {
        argValue.values = argValue.values.flatMap((value) =>
          value
            .split(/,/)
            .map((s) => s.trim())
            .filter(Boolean)
        )
      }

      if (!isList && argValue.values.length > 1) {
        throw new NoArgError(
          `Multiple value entered \`${argValue.values
            .map(colors.green)
            .join('` `')}\` for option ${colors.cyan(argValue.arg)}`
        )
      }

      const { value, error, valid } = argValue.schema.parse(
        isList ? argValue.values : argValue.values[0]
      )

      if (!valid) {
        throw new NoArgError(
          `${error} for option: ${colors.cyan(argValue.arg)}`
        )
      }

      output[key] = value
    }

    const combinedFlags = { ...this.options.globalFlags, ...this.options.flags }
    for (const key in combinedFlags) {
      const schema = combinedFlags[key]

      const hasValue = key in output
      const isRequired = schema.config.required

      if (!hasValue) {
        if (schema.config.askQuestion !== undefined) {
          const value = await askCli(schema, colors.cyan(`--${key}`) + ':')
          output[key] = value
          continue
        }

        if ('default' in schema.config) {
          output[key] = schema.config.default
          continue
        }

        if (isRequired) {
          throw new NoArgError(`Option ${colors.cyan('--' + key)} is required`)
        }
      }
    }

    return output
  }

  private async parseCore(args: string[]) {
    const [argsList, optionsRecord, trailingArgs] = this.divideArguments(args)

    const { resultArgs, resultOptArgs, resultListArg } =
      await this.parseArguments(argsList)

    const resultFlags = await this.parseFlags(optionsRecord)

    return {
      args: resultArgs,
      flags: resultFlags,
      optArgs: resultOptArgs,
      listArgs: resultListArg,
      trailingArgs: trailingArgs,
    }
  }

  protected parseStart(
    args: string[]
  ): ReturnType<typeof this.parseCore> | void {
    if (this.browsePrograms(args)) return

    if (this.config.help) {
      const self = this as unknown as NoArgProgram<any, any, any, any>

      args.forEach((arg) => {
        if (arg === '--help' || arg === '-h') {
          self.renderHelp()
          return process.exit(0)
        }

        if (arg === '--help-usage' || arg === '-hu') {
          self.renderUsage()
          return process.exit(0)
        }
      })
    }

    return this.parseCore(args)
  }
}

export module NoArgParser {
  export type ParsedFlagRecord = {
    arg: string
  } & (
    | {
        key: string
        value: string | null
        argType: 'flag' | 'alias'
        hasBooleanEndValue: true
      }
    | {
        key: null
        value: string
        argType: 'value'
      }
  )

  export type ParsedFlagWithSchema = {
    arg: string
    schema: TSchema
    values: string[]
    argType: Exclude<NoArgParser.ParsedFlagRecord['argType'], 'value'>
  }

  export const flagRegex = /^(\-\-)([^\-])/
  export const flagAliasRegex = /^(\-)([^\-])/
  export const optionWithValueRegex = /^(?<key>[^\=]+)\=(?<value>.+)/
}
