console.clear()

import t from './schemaType/t'
import NoArg from './NoArg'

const app = new NoArg(
  'app',

  {
    description: 'This is a test program',

    options: {
      config: t
        .string()
        .required()
        .aliases('c', 'cfg', 'configuration', 'conf'),
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
  },

  (args, options, config) => {
    console.log({ app: args })
  }
)

app.create(
  'test',
  {
    description: 'This is a test program',

    arguments: [
      // { name: 'arg-1', type: t.number() },
      // { name: 'arg-2', type: t.boolean() },
    ],

    // listArgument: {
    //   name: 'args',
    //   type: t.number(),
    // },

    programs: {},

    options: {
      // bool: t.boolean().required(),
      // number: t.number(),
      // string: t.string().aliases('s'),
      abc: t.array(t.string()),
      xyz: t.array(t.string()),
      df: t.string(),
    },
  },
  (args, options, config) => {
    console.log('\n')
    console.log({ args, options })
  }
)

const sampleArgs = [
  'test',

  '4',
  'true',

  '1',
  '3',
  '9',
  '11',

  '--bool',

  '--number=113355',
  // '--number',
  // '113355',
  '-s',
  'STRING',
  '--list',
  '1',
  '3',
  '9',
  '9',
  '9',
  '9',

  '--config',
  '\\--config',

  // '-h',
  // '--help',
]

// app.run(sampleArgs)
const test = app.run([
  'test',

  '--df',

  '--abc',

  '\\-c',
  '\\--c',
  '\\---c',
  '---c',

  '--xyz',

  '\\-abc',
  '\\--abc',
  '\\---abc',
  '---abc',
])
