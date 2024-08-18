import colors from '../lib/colors'
import { TSchema, TSchemaPrimitive } from '../schema/type.t'
import TypeArray, { TypeArrayConfig } from '../schema/TypeArray'
import { TypeBoolean } from '../schema/TypeBoolean'
import TypeTuple, { TypeTupleConfig } from '../schema/TypeTuple'
import { Prettify } from '../types/util.t'
import { NoArgCore } from './NoArgCore'
import { NoArgError } from './NoArgError'
import * as readLineSync from 'readline-sync'
import verifyFlagName from '../helpers/verify-flag-name'

export class NoArgParser<
  TName extends string,
  TSystem extends NoArgCore.System,
  TConfig extends NoArgCore.Config,
  TOptions extends NoArgCore.Options
> extends NoArgCore<TName, TSystem, TConfig, TOptions> {
  private browsePrograms([name, ...args]: string[]) {
    const program = this.programs.get(name)
    if (program) {
      program.startCore(args)
      return true
    }
  }

  private divideArguments(args: string[]) {
    let isOptionReached = false
    const argList: string[] = []
    const options: NoArgParser.ParsedFlagRecord[] = []

    for (let arg of args) {
      const result = this.getFlagMetadata(arg)

      if (result.optionType && !isOptionReached) {
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
    const duplicateArgs = [...args]
    this.options.arguments ??= []
    this.options.optionalArguments ??= []

    if (duplicateArgs.length < this.options.arguments.length) {
      const givenArgsCount = duplicateArgs.length
      const neededArgsCount = this.options.arguments.length
      const missingArgsCount =
        this.options.arguments.length - duplicateArgs.length

      const remainingArgs = this.options.arguments
        .slice(givenArgsCount)
        .map(({ name }) => colors.blue(name))
        .join(', ')

      throw new NoArgError(
        `Expected ${neededArgsCount} arguments, missing: ${missingArgsCount}, [${remainingArgs}]`
      )
    }

    const resultArgs = this.options.arguments.map((config) => {
      const input = duplicateArgs.shift()!
      if (!config.type) return input
      const { value, error, valid } = config.type.parse(input)
      if (valid) return value
      throw new NoArgError(`${error} for argument: ${colors.blue(config.name)}`)
    })

    const resultOptArgs = this.options.optionalArguments?.map((config) => {
      if (duplicateArgs.length === 0) return
      const input = duplicateArgs.shift()!
      if (!config.type) return input
      const { value, error, valid } = config.type.parse(input)
      if (valid) return value
      throw new NoArgError(`${error} for argument: ${colors.blue(config.name)}`)
    })

    const resultList: any[] = []
    if (this.options.listArgument?.type) {
      const arraySchema = new TypeArray({
        schema: this.options.listArgument.type,
        minLength: this.options.listArgument.minLength,
        maxLength: this.options.listArgument.maxLength,
      })

      const { value, error, valid } = arraySchema.parse(duplicateArgs)

      if (valid) {
        resultList.push(...value)
      } else {
        throw new NoArgError(
          `${error} for list argument: ${colors.blue(
            this.options.listArgument.name
          )}`
        )
      }
    }

    return { resultArgs, resultOptArgs, resultList }
  }

  private findFlagInSchema(record: NoArgParser.ParsedFlagRecord) {
    const combinedFlags = { ...this.options.globalFlags, ...this.options.flags }

    if (record.optionType === 'flag') {
      const schema = combinedFlags[record.key!]
      if (schema) return [record.key!, schema] as const
    }

    if (record.optionType === 'alias') {
      const found = Object.entries(combinedFlags).find(([, schema]) => {
        return schema.config.aliases?.includes(record.key!)
      })

      if (found) return found
    }

    throw new NoArgError(`Unknown option ${colors.red(record.raw)} entered`)
  }

  private getFlagMetadata(arg: string): NoArgParser.ParsedFlagRecord {
    const isFlag = NoArgParser.flagRegexp.test(arg)
    const isAlias = NoArgParser.flagAliasRegexp.test(arg)
    const optionType = isFlag
      ? ('flag' as const)
      : isAlias
      ? ('alias' as const)
      : null

    let key = isFlag ? arg.slice(2) : isAlias ? arg.slice(1) : null
    let value = null
    let hasBooleanEndValue = false

    if (key) {
      const hasValue = NoArgParser.optionWithValueRegexp.test(key)

      if (hasValue) {
        const { value: _value = null, key: _key = null } =
          key.match(NoArgParser.optionWithValueRegexp)?.groups ?? {}

        key = _key
        value = _value
      } else if (
        this.system.booleanNotSyntaxEnding &&
        key.endsWith(this.system.booleanNotSyntaxEnding)
      ) {
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

  private parseFlagsCore([record, ...records]: NoArgParser.ParsedFlagRecord[]) {
    if (!record && records.length === 0) return {}
    const self = this

    if (!record?.optionType) {
      throw new NoArgError(
        `Something went wrong, received ${colors.yellow(
          record.raw
        )}. Expected an option`
      )
    }

    let currentOptionKey: string = record.raw
    const output: Record<
      string,
      Prettify<
        NoArgParser.ParsedFlagRecord & {
          schema: TSchema
          values: string[]
          optionType: Exclude<NoArgParser.ParsedFlagRecord['optionType'], null>
        }
      >
    > = {}

    function checkRecord(record: NoArgParser.ParsedFlagRecord) {
      if (record.key) {
        try {
          verifyFlagName(
            'Option',
            record.key,
            self.system.booleanNotSyntaxEnding
          )
        } catch (err: any) {
          throw new NoArgError(
            err.message + ' for option ' + colors.red(record.raw)
          )
        }
      }

      if (record.optionType) {
        const [key, schema] = self.findFlagInSchema(record)
        currentOptionKey = key

        if (output[currentOptionKey]) {
          if (
            output[currentOptionKey].schema instanceof TypeArray ||
            output[currentOptionKey].schema instanceof TypeTuple
          ) {
            return
          }

          throw new NoArgError(
            `Duplicate option ${colors.cyan(record.raw!)} entered`
          )
        }

        if (record.hasBooleanEndValue) {
          if (schema instanceof TypeBoolean) record.value = 'false'
          else
            throw new NoArgError(
              `Only boolean types accept '${
                self.system.booleanNotSyntaxEnding
              }' assignment for option: ${colors.red(record.raw)}`
            )
        }

        return (output[currentOptionKey] = {
          schema,
          values: record.value !== null ? [record.value] : [],

          ...(record as typeof record & {
            optionType: typeof record.optionType
          }),
        })
      }

      output[currentOptionKey].values.push(record.raw)
    }

    checkRecord(record)
    records.forEach(checkRecord)
    return output
  }

  private askPrimitiveInput(
    schema: TSchemaPrimitive,
    options: { forceTitle?: string; inputRequired?: boolean } = {}
  ): unknown {
    while (true) {
      const input = readLineSync.question(
        `${options.forceTitle ?? colors.yellow(schema.name)}: `,
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
    schema.config.minLength ??= 0
    schema.config.maxLength ??= Infinity

    while (output.length < schema.config.maxLength) {
      const input = this.askPrimitiveInput(schema.config.schema, {
        forceTitle:
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
        forceTitle:
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
          `No value given for option: ${colors.red(argValue.raw)}`
        )
      }

      const isList =
        argValue.schema instanceof TypeArray ||
        argValue.schema instanceof TypeTuple

      if (!isList && argValue.values.length > 1) {
        throw new NoArgError(
          `Multiple value entered [${argValue.values
            .map(colors.green)
            .join(', ')}] for option ${colors.cyan(argValue.raw)}`
        )
      }

      const { value, error, valid } = argValue.schema.parse(
        isList ? argValue.values : argValue.values[0]
      )

      if (!valid) {
        throw new NoArgError(
          `${error} for option: ${colors.cyan(argValue.raw)}`
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
        if (schema.config.ask) {
          console.log(`--${colors.red(key)} ${colors.cyan(schema.config.ask!)}`)

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
      let hasHelp = false
      let hasUsage = false
      args.some((current) => {
        if (current === '--help' || current === '-h') {
          hasHelp = true
          return true
        }

        if (current === '--usage' || current === '-u') {
          hasUsage = true
          return true
        }
      })

      if (hasHelp || hasUsage) {
        console.clear()
        hasHelp && (this['renderHelp' as keyof this] as any)()
        hasUsage && (this['renderUsages' as keyof this] as any)()
        return process.exit(0)
      }
    }

    return this.parseCore(args)
  }
}

export module NoArgParser {
  export type ParsedFlagRecord = {
    raw: string
    key: string | null
    value: string | null
    optionType: 'flag' | 'alias' | null
    hasBooleanEndValue: boolean
  }

  export const flagAliasRegexp = /^(\-)([^\-])/
  export const flagRegexp = /^(\-\-)([^\-])/
  export const optionWithValueRegexp = /^(?<key>[^\=]+)\=(?<value>.+)/
}
