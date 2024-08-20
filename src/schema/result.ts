export class ResultOk {
  constructor(public value: any) {}
}

export class ResultErr {
  constructor(public message: string) {}
}