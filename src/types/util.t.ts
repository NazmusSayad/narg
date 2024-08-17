export type Prettify<T extends object> = {
  [Key in keyof T]: T[Key]
} & {}

export type MakeObjectOptional<T> = {
  [Key in keyof T as undefined extends T[Key] ? never : Key]: T[Key]
} & {
  [Key in keyof T as undefined extends T[Key] ? Key : never]?: T[Key]
}

export type MergeObject<T extends object, U extends object> = {
  [Key in keyof T | keyof U]: Key extends keyof U
    ? U[Key]
    : Key extends keyof T
    ? T[Key]
    : never
}

export type NotReadonly<T> = {
  -readonly [Key in keyof T]: T[Key]
}

export type RemoveUnknownValueFromObject<T extends object> = {
  [Key in keyof T as T[Key] extends unknown ? never : Key]: T[Key]
}
