import { Mutable } from 'utility-types'

export type Prettify<T extends Record<string, any>> = {
  [Key in keyof T]: T[Key]
} & {}

export type MergeObject<T, U> = Omit<T, keyof U> & U
export type MergeObjectPrettify<T, U> = Prettify<MergeObject<T, U>>

export type MakeObjectOptional<T> = {
  [Key in keyof T as undefined extends T[Key] ? never : Key]: T[Key]
} & {
  [Key in keyof T as undefined extends T[Key] ? Key : never]?: T[Key]
}

export type ReallyRequired<T> = { [P in keyof T]-?: Exclude<T[P], undefined> }

export type DeepMutable<T> = T extends (...args: any[]) => any
  ? T
  : T extends any[]
  ? DeepMutableArray<T[number]>
  : T extends object
  ? DeepMutableObject<T>
  : T
/** @private */
export type DeepMutableArray<T> = Array<DeepMutable<Mutable<T>>>
/** @private */
export declare type DeepMutableObject<T> = {
  [P in keyof T]-?: DeepMutable<Mutable<T[P]>>
}
