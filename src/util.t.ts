import { Prettify } from './utils'

export type MakeObjectOptional<T> = Prettify<
  {
    [Key in keyof T as undefined extends T[Key] ? never : Key]: T[Key]
  } & {
    [Key in keyof T as undefined extends T[Key] ? Key : never]?: T[Key]
  }
>
