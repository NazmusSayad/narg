console.clear()

import t from './schemaType/t'
import NoArg from './NoArg'

const app = new NoArg(
  'app',

  {
    description: 'This is a test program',

    options: {
      config: t.string('abc'),
    },

    arguments: [
      { name: 'arg-1', type: t.number() },
      { name: 'arg-2', type: t.boolean() },
      { name: 'arg-3' },
    ],

    listArgument: {
      name: 'args',
      type: t.boolean(),
      minLength: 1,
      maxLength: 3,
    },

    // errorOnMultipleValues: true,
    errorOnDuplicateOption: true,
  },

  (args, options, config) => {
    console.log({ app: args })
  }
)

app.create(
  'build',
  {
    description: 'Build the package for production',
    options: {
      root: t.string().default('.').aliases('r').description('Root directory'),

      module: t.string('cjs').aliases('m').description("Output module's type"),

      outDir: t
        .string()
        .default('./dist')
        .aliases('o')
        .description('Output directory'),

      tsc: t
        .array(t.string())
        .aliases('t')
        .default([])
        .description("TypeScript's options"),

      numbers: t.array(t.number()),
      node: t
        .boolean()
        .aliases('n')
        .default(false)
        .description('Enable __dirname and __filename in ES modules'),

      test: t
        .boolean()
        .aliases('t')
        .description('Test')
        .required()
        .default(true),
    },
  },

  (_, options, config) => {
    console.log({ options })
  }
)

app.run([
  'build',

  '-h',
  '-u',

  '--root',
  'npmize-test',

  '--node',
  // '-n',
  'NO',
  // 'false',

  '-t',
  'strict',
  'noEmit',

  '-o',
  'dist',

  '-m',
  'cjs',

  '--numbers=0001',
  '1',
  '10',
])
