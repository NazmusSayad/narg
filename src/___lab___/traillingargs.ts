import NoArg from '..'

const app = NoArg.create('app', {
  flags: {
    A: NoArg.string(),
    b: NoArg.number(),
  },

  arguments: [
    { name: 'arg1', description: 'Argument 1', type: NoArg.number() },
  ],

  listArgument: {
    name: 'super',
    description: 'List of items',
    type: NoArg.string(),
    maxLength: 1,
  },

  config: {
    enableTrailingArgs: true,
    trailingArgsSeparator: '-',
  },

  system: {},
})

app.on((args, flags, config) => {
  console.log(args)
  console.log(flags)
})

app.start(['1', '1', '2', '--A', 'hello', '--b', '123', '-', '2', '3', '4'])
