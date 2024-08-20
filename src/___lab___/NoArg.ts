import colors from '../lib/colors'
import NoArgRoot from '../NoArg/index'
import schema from '../schema/index'

import { splitTrailingArgs } from '..'

console.log(splitTrailingArgs(['--silent', 'true', '--', '--no', 'false']))

function callback(args: any, flags: any) {
  console.log(colors.green('-----------------'))
  console.log(args)
  console.log(flags)
}

const app = NoArgRoot.create('app', {
  description: 'This is an app',
  flags: {
    zzzz: schema.string(),
    test: schema.string().required(),
    test2: schema.string().required(),
    sql: schema.string().required(),
    sql2: schema.string().required(),
    sup: schema.string(),
  },
  globalFlags: { silent: schema.string() },
  config: {},
  arguments: [{ name: 'root', ask: 'What is your root?' }],
  optionalArguments: [{ name: 'nope', type: schema.number() }],
  listArgument: { name: 'test', minLength: 2, maxLength: 3 },

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

// app.start(['-hu'])

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
