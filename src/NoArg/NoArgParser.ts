import * as readLineSync from 'readline-sync'
import colors from '../lib/colors'
import { NoArgCore } from './NoArgCore'
import { NoArgError } from './NoArgError'
import { isSchemaList } from '../schema/utils'
import type { NoArgProgram } from './NoArgProgram'
import { TypeBoolean } from '../schema/TypeBoolean'
import { TSchema, TSchemaPrimitive } from '../schema/type.t'
import TypeTuple, { TypeTupleConfig } from '../schema/TypeTuple'
import TypeArray, { TypeArrayConfig } from '../schema/TypeArray'

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
    let isOptionReached = false
    const argList: string[] = []
    const options: NoArgParser.ParsedFlagRecord[] = []

    for (let arg of args) {
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

    return [argList, options] as const
  }

  private parseArguments(args: string[]) {
    args = [...args]
    this.options.arguments ??= []
    this.options.optionalArguments ??= []

    const resultArgs = this.options.arguments.map((config) => {
      const input = args.shift()

      if (!input) {
        if (!config.type?.config.askQuestion) {
          throw new NoArgError(
            `No value provided for argument: ${colors.blue(config.name)}`
          )
        }

        console.log(
          `${colors.red(config.name)}: ${colors.cyan(
            config.type.config.askQuestion
          )}`
        )
        return this.askPrimitiveInput(config.type, {
          inputRequired: true,
        })
      }

      if (!config.type) return input
      const { value, error, valid } = config.type.parse(input)
      if (valid) return value
      throw new NoArgError(`${error} for argument: ${colors.blue(config.name)}`)
    })

    const resultOptArgs = this.options.optionalArguments.map((config) => {
      if (args.length === 0) return
      const input = args.shift()
      if (!config.type) return input
      const { value, error, valid } = config.type.parse(input)
      if (valid) return value
      throw new NoArgError(`${error} for argument: ${colors.blue(config.name)}`)
    })

    const resultListArg: any[] = []
    if (this.options.listArgument) {
      if (!this.options.listArgument.type) {
        resultListArg.push(...args)
      } else {
        const arraySchema = new TypeArray({
          schema: this.options.listArgument.type,
          minLength: this.options.listArgument.minLength,
          maxLength: this.options.listArgument.maxLength,
        })

        const { value, error, valid } = arraySchema.parse(args)

        if (valid) {
          resultListArg.push(...value)
        } else {
          throw new NoArgError(
            `${error} for list argument: ${colors.blue(
              this.options.listArgument.name
            )}`
          )
        }
      }
    }

    return { resultArgs, resultOptArgs, resultList: resultListArg }
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

      if (isSchemaList(outputRecord.schema)) {
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

  private askPrimitiveInput(
    schema: TSchemaPrimitive,
    options: { forceTypeLabel?: string; inputRequired?: boolean } = {}
  ): unknown {
    while (true) {
      const input = readLineSync.question(
        `${
          options.forceTypeLabel ??
          colors.yellow(schema.name) +
            (schema.config.default != null ? '?' : '')
        }: `,
        {
          defaultInput: schema.config.default,
        }
      )

      if (input === '') {
        if (schema instanceof TypeBoolean) {
          console.log(
            colors.dim(
              `INFO: Empty value is considered as ${colors.yellow('false')}`
            )
          )
          return false
        }
        if (options.inputRequired) {
          console.log(colors.red("Empty input isn't acceptable"))
          continue
        }
      }

      const { value, error, valid } = schema.parse(input)
      if (valid) return value
      console.log(colors.red(error))
    }
  }

  private askArrayInput(schema: TypeArray<TypeArrayConfig>) {
    const output: any[] = []
    delete schema.config.schema.config.default
    schema.config.minLength ??= 0
    schema.config.maxLength ??= Infinity

    while (output.length < schema.config.maxLength) {
      const input = this.askPrimitiveInput(schema.config.schema, {
        forceTypeLabel:
          colors.yellow(schema.config.schema.name) +
          '[' +
          colors.yellow(String(output.length + 1)) +
          ']',
      })

      if (input) {
        output.push(input)
      } else {
        if (output.length >= schema.config.minLength) break
        console.log(
          colors.red(
            `Minimum ${schema.config.minLength} items required for ${schema.config.schema.name}`
          )
        )
      }
    }

    return output
  }

  private askTupleInput(schema: TypeTuple<TypeTupleConfig>) {
    return schema.config.schema.map((schema, i) => {
      return this.askPrimitiveInput(schema, {
        inputRequired: true,
        forceTypeLabel:
          colors.yellow(schema.name) + '[' + colors.yellow(String(i)) + ']',
      })
    })
  }

  private parseFlags(records: NoArgParser.ParsedFlagRecord[]): any {
    const options = this.parseFlagsCore(records)
    const output: Record<string, any> = {}

    Object.entries(options).forEach(([key, argValue]) => {
      if (argValue.values.length === 0) {
        if (argValue.schema instanceof TypeBoolean) {
          return (output[key] = true)
        }

        throw new NoArgError(
          `No value given for option: ${colors.red(argValue.arg)}`
        )
      }

      const isList = isSchemaList(argValue.schema)

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
    })

    const combinedFlags = { ...this.options.globalFlags, ...this.options.flags }

    Object.entries(combinedFlags).forEach(([key, schema]) => {
      const hasValue = key in output
      const isRequired = schema.config.required
      const hasDefault = 'default' in schema.config

      if (!hasValue) {
        if (schema.config.askQuestion) {
          console.log(
            `--${colors.red(key)}: ${colors.cyan(schema.config.askQuestion!)}`
          )

          const value =
            schema instanceof TypeArray
              ? this.askArrayInput(schema)
              : schema instanceof TypeTuple
              ? this.askTupleInput(schema)
              : this.askPrimitiveInput(schema, { inputRequired: true })

          return (output[key] = value)
        }

        if (hasDefault) {
          return (output[key] = schema.config.default)
        }

        if (isRequired) {
          throw new NoArgError(`Option ${colors.cyan('--' + key)} is required`)
        }
      }
    })

    return output
  }

  private parseCore(args: string[]) {
    const [argsList, optionsRecord] = this.divideArguments(args)
    const { resultArgs, resultOptArgs, resultList } =
      this.parseArguments(argsList)
    const resultOptions = this.parseFlags(optionsRecord)

    const output = {
      flags: resultOptions,
      args: resultArgs,
      optArgs: resultOptArgs,
      listArgs: resultList,
    }

    return output
  }

  protected parseStart(
    args: string[]
  ): ReturnType<typeof this.parseCore> | void {
    if (this.browsePrograms(args)) return

    if (!this.config.disableHelp) {
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
