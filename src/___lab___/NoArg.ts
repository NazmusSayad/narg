import colors from '../lib/colors'
import NoArgRoot from '../NoArg/index'
import schema from '../schema/index'

function callback(args: any, flags: any) {
  console.log(colors.green('-----------------'))
  console.log(args)
  console.log(flags)
}

const app = NoArgRoot.create('app', {
  description: 'This is an app',
  flags: {
    zzzz: schema.string(),
    sup: schema.string().ask('who are you?'),
    test: schema
      .array(schema.string().default('test'))
      .required()
      .minLength(2)
      .ask('who are you?'),
    test2: schema.string().required(),
    sql: schema.string().required(),
    sql2: schema.string().required(),
  },
  globalFlags: { silent: schema.string() },
  config: {},
  // arguments: [
  //   { name: 'root', type: schema.string().ask('who are you?').default('root') },
  // ],
  // optionalArguments: [{ name: 'nope', type: schema.number() }],
  // listArgument: { name: 'test', minLength: 2, maxLength: 3 },

  system: {},
}).on(callback)

const inner = app
  .create('inner', {
    description: 'This is an inner for app',
    config: { disableHelp: false },
    arguments: [{ name: 'testsdf' }],
    listArgument: { name: 'test', type: schema.number() },
  })
  .on((result) => {
    console.log({ result })
  })

const inner2 = app
  .create('inner2', {
    config: { disableHelp: false },
    arguments: [{ name: 'testsdf' }],
    listArgument: { name: 'test', type: schema.number() },
  })
  .on(callback)

const superInner = inner
  .create('superInner', {
    arguments: [
      { name: 'joss1', type: schema.string(), askQuestion: 'who are you?' },
      // { name: 'joss2', type: schema.string(), askQuestion: 'who are you?' },
      // { name: 'joss3', type: schema.string(), askQuestion: 'who are you?' },
    ],
    optionalArguments: [{ name: 'nope', type: schema.string() }],
    listArgument: { name: 'test' },
    flags: {
      files: schema.array(schema.string()).aliases('f'),
      do: schema.boolean(),
      no: schema.boolean(),
    },
    config: { disableHelp: false },
  })
  .on(callback)

// app.start([''])

const inputTest = NoArgRoot.create('inputTest', {
  arguments: [
    {
      name: 'root',
      type: schema
        .string('main', 'master')
        .ask('who are you?')
        .default('master'),
    },
  ],

  flags: {
    do: schema.number().aliases('f').ask('who are you?').default(1),
  },
})

inputTest.on(([result], flags) => {
  console.log('RESULT:', flags)
})

inputTest.start([])

// const result = app.start([
//   'inner',
//   'superInner',
//   'arg',
//   'opt',
//   '1',
//   '2',
//   '3',
//   '--do\\',
//   '--files',
//   'when',
//   'when2',
//   '--files',
//   'how',
//   '--files=single',
//   'double',
//   '--silent',
//   'true',
//   // '--silent',
//   // 'false',
//   '--no',
// ])
