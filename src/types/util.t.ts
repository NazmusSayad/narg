export type Prettify<T extends Record<string, any>> = {
  [Key in keyof T]: T[Key]
} & {}

export type MergeObject<T, U> = Omit<T, keyof U> & U

export type MakeObjectOptional<T> = {
  [Key in keyof T as undefined extends T[Key] ? never : Key]: T[Key]
} & {
  [Key in keyof T as undefined extends T[Key] ? Key : never]?: T[Key]
}

export type ReallyRequired<T> = { [P in keyof T]-?: Exclude<T[P], undefined> }
