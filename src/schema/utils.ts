import { TSchema } from './type.t'
import TypeArray from './TypeArray'
import { TypeBoolean } from './TypeBoolean'
import TypeNumber from './TypeNumber'
import TypeString from './TypeString'
import TypeTuple from './TypeTuple'

export function isSchemaList(schema: TSchema): boolean {
  return schema instanceof TypeArray || schema instanceof TypeTuple
}

export function isSchemaPrimitive(schema: TSchema): boolean {
  return (
    schema instanceof TypeString ||
    schema instanceof TypeNumber ||
    schema instanceof TypeBoolean
  )
}
