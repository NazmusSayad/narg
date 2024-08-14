console.clear()
import NoArg, { t } from '.'

const app = NoArg.create(
  'app',

  {
    description: 'This is a test program',

    options: {
      config: t
        .number()
        .global()
        // .ask('Do you want to see the config?')
        .default(0),
    },

    arguments: [
      { name: 'arg-1', type: t.number() },
      { name: 'arg-2', type: t.boolean() },
      { name: 'arg-3' },
    ],

    optionalArguments: [{ name: 'super-arg', type: t.string() }],

    listArgument: {
      name: 'args',
      type: t.boolean(),
      minLength: 0,
      maxLength: 2,
    },

    config: { booleanFalsePrefixSuffix: '\\' },
  },

  (config) => {
    console.log(config)
  }
)

// const build = app.create(
//   'build',
//   {
//     description: 'Build the package for production',
//     options: {
//       root: t.string().default('.').aliases('r').description('Root directory'),

//       module: t.string('cjs').aliases('m').description("Output module's type"),

//       outDir: t
//         .string()
//         .default('./dist')
//         .aliases('o')
//         .description('Output directory'),

//       tsc: t
//         .array(t.string())
//         .aliases('t')
//         .default([])
//         .description("TypeScript's options"),

//       numbers: t.array(t.number()),
//       node: t
//         .boolean()
//         .aliases('n')
//         .default(false)
//         .description('Enable __dirname and __filename in ES modules'),

//       test: t
//         .boolean()
//         .aliases('t')
//         .description('Test')
//         .required()
//         .default(true),
//     },
//   },

//   (_, options) => {
//     console.log({ options })
//   }
// )

// const deep = build.create('test', {}, (args, options) => {})

// build.renderHelp()
// app.run(['1', 'yes', '3', 'no', '--help', '--use'])

app.run([
  '100',
  'true',
  'build',

  'true',
  'true',

  // '--root',
  // 'npmize-test',

  // '--node',
  // '-n',
  // 'NO',
  // 'false',

  // '-t',
  // 'strict',
  // 'noEmit',

  // '-o',
  // 'dist',

  // '-m',
  // 'cjs',

  // '--numbers=0001',
  // '1',
  // '10',

  // '--test\\',

  // '-h',

  '--help-use',
])
