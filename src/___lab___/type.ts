import NoArg from '..'

const app = NoArg.create('app', {
  arguments: [
    {
      name: 'name',
      type: NoArg.string(),
      description: 'The name of the user',
    },
  ],

  optionalArguments: [
    {
      name: 'age',
      type: NoArg.number(),
      description: 'The age of the user',
    },
  ],

  listArgument: {
    name: 'names',
    type: NoArg.string(),
    description: 'The names of the users',
  },

  flags: {
    age: NoArg.number(1, 18),
  },

  trailingArguments: 'true',

  globalFlags: {
    silent: NoArg.string('TEST'),
  },
})

app.create('sub', {
  arguments: [
    {
      name: 'name',
      type: NoArg.string(),
      description: 'The name of the user',
    },
  ],

  globalFlags: {
    silent2: NoArg.string('TEST'),
  },

  config: {
    skipGlobalFlags: true,
  },
})

app.on((args, flags, config) => {
  console.log(args)
  console.log(flags)
})

app.start(['name'])

type Flags = NoArg.InferFlags<typeof app>
type GlobalFlags = NoArg.InferGlobalFlags<typeof app>
type CombinedFlags = NoArg.InferCombinedFlags<typeof app>
type Arguments = NoArg.InferArguments<typeof app>
type OptArgs = NoArg.InferOptionalArguments<typeof app>
type List = NoArg.InferListArguments<typeof app>
