import NoArg from '..'
import colors from '../lib/colors'

// NoArg.colors.disable()

function callback(args: any, flags: any) {
  console.log(colors.green('-----------------'))
  console.log(args)
  console.log(flags)
}

const app = NoArg.create('app', {
  description: 'This is an app',
  flags: {
    vbc: NoArg.string(
      '1',
      '2',
      '3',
      'asdf',
      '5',
      '6',
      '7',
      '8',
      '234',
      '10'
    ).ask('who are you?'),
    bbc: NoArg.string().ask('who are you?'),
    abc: NoArg.string().ask('who are you?'),
    zzz: NoArg.string(),
    sup: NoArg.string().ask('who are you?'),
    test: NoArg.array(NoArg.string().default('test'))
      .required()
      .minLength(2)
      .ask('who are you?'),
    test2: NoArg.string().required(),
    sql: NoArg.string().required(),
    sql2: NoArg.string().required(),
  },
  globalFlags: { silent: NoArg.string() },
  config: {},
  arguments: [
    {
      name: 'root',
      type: NoArg.string().ask('who are you?').default('root'),
    },
  ],
  // optionalArguments: [{ name: 'nope', type: NoArg.number() }],
  // listArgument: { name: 'test', minLength: 2, maxLength: 3 },

  system: { enableHelpBoxBorder: true },
}).on(callback)

const inner = app
  .create('inner', {
    description: 'This is an inner for app',
    config: { help: false },
    arguments: [{ name: 'testsdf', type: NoArg.number() }],
    listArgument: { name: 'test', type: NoArg.number() },
  })
  .on((result) => {
    console.log({ result })
  })

const inner2 = app
  .create('inner2', {
    config: { help: false },
    arguments: [{ name: 'testsdf', type: NoArg.number() }],
    listArgument: { name: 'test', type: NoArg.number() },
  })
  .on(callback)

const superInner = inner
  .create('superInner', {
    arguments: [
      // { name: 'joss1', type: NoArg.string().ask('who are you?') },
      // { name: 'joss2', type: NoArg.string(), askQuestion: 'who are you?' },
      // { name: 'joss3', type: NoArg.string(), askQuestion: 'who are you?' },
    ],
    optionalArguments: [{ name: 'nope', type: NoArg.string() }],
    listArgument: { name: 'test', type: NoArg.number() },
    flags: {
      files: NoArg.array(NoArg.string()).aliases('f'),
      do: NoArg.boolean(),
      no: NoArg.boolean(),
      test: NoArg.string('1', '2').ask('test'),
    },
    config: { help: true },
  })
  .on((args, flags) => {
    console.log({ args, flags })
  })

// app.start([''])

const inputTest = NoArg.create('inputTest', {
  arguments: [
    {
      name: 'root',
      type: NoArg.string('main', 'master')
        .ask('who are you?')
        .default('master'),
    },
  ],

  flags: {
    do: NoArg.number().aliases('f').ask('who are you?').default(1),
  },
})

inputTest.on(([result], flags) => {
  console.log('RESULT:', flags)
})

// inputTest.start([])

app.start([
  // 'inner',
  // 'superInner',
  // 'arg',
  // 'opt',
  // '1',
  // '2',
  // '3',
  '--do\\',
  '--files',
  'when',
  'when2',
  '--files',
  'how',
  '--files=single',
  'double',
  '--silent',
  'true',
  // '--silent',
  // 'false',
  '-h',
])
