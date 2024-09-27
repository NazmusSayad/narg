import NoArg from '..'

const devAndBuild = NoArg.defineConfig({
  arguments: [
    {
      name: '@',
      type: NoArg.string().description('Root directory'),
    },
  ],

  optionalArguments: [
    {
      name: 'root',
      type: NoArg.string().description('Root directory'),
    },
    {
      name: 'root',
      type: NoArg.string().description('Root directory'),
    },
    {
      name: 'root',
      type: NoArg.string().description('Root directory'),
    },
  ],

  flags: {
    module: NoArg.string('cjs', 'mjs')
      .aliases('m')
      .description("Output module's type"),

    outDir: NoArg.string().aliases('o').description('Output directory'),

    node: NoArg.boolean()
      .aliases('n')
      .default(false)
      .description('Enable __dirname and __filename in ES modules'),
  },

  trailingArguments: '',

  config: {},
})

const app = NoArg.create('app', {
  flags: {
    A: NoArg.string(),
    b: NoArg.number(),
    abc: NoArg.array(NoArg.string()).minLength(1),
  },

  arguments: [
    { name: 'arg1', description: 'Argument 1', type: NoArg.number() },
  ],

  listArgument: {
    name: 'args to pass',
    description: 'List of items',
    type: NoArg.string(),
    maxLength: 1,
  },

  system: {
    // enableHelpBoxBorder: true,
  },
  trailingArguments: '--',
  customRenderHelp: {
    helpUsageTrailingArgsLabel: '--[flags/args to pass]',
  },
})

const child = app.create('child', {
  listArgument: {
    name: 'super',
    description: 'List of items',
    type: NoArg.string(),
  },
  notes: ['This is a note'],

  ...devAndBuild,
})

child.on((args, flags, config) => {
  child.renderUsage()

  console.log(args)
  console.log(flags)
})

app.start(['child', '--help', '456'])
