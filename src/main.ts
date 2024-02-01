import t from './schemaType/t'
import Program from './program'

const app = new Program(
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
      { name: 'arg-1', type: t.number() },
      { name: 'arg-2', type: t.boolean() },
    ],

    listArgument: {
      name: 'args',
      type: t.string(),
    },

    programs: {},

    options: {
      bool: t.boolean().required(),
      number: t.number(),
      string: t.string().aliases('s'),
      list: t.array(t.number()),
    },
  },
  (args, options, config) => {
    console.log('\n')
    console.log({ args, options })
  }
)

app.run([
  'test',

  // '4',
  // 'true',

  // '1',
  // '3',
  // '9',
  // '11',

  // '--number',
  // '113355',
  // '-s',
  // 'STRING',
  // '--list',
  // '1',
  // '3',
  // '9',
  // '--bool',
  '-h',
  // '--help',
])
