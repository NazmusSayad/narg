import colors from '../lib/colors'
import NoArgRoot from '../NoArg/index'
import schema from '../schema/index'

function callback(args: any, flags: any) {
  console.log(colors.green('-----------------'))
  console.log({ args, flags })
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
  globalFlags: {
    silent: schema.string().default('false'),
    files: schema.array(schema.string()).required(),
  },
  config: { disableHelp: true },
  arguments: [{ name: 'root' }],
  optionalArguments: [{ name: 'nope', type: schema.number() }],
  system: {
    booleanNotSyntaxEnding: '!',
  },
  listArgument: { name: 'test', minLength: 2, maxLength: 3 },
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
    arguments: [{ name: 'joss', type: schema.number() }],
    optionalArguments: [{ name: 'nope', type: schema.number() }],
    listArgument: { name: 'test', type: schema.string() },
    config: { disableHelp: false },
  })
  .on((args, flags) => {
    console.log(args)
    console.log(flags)
  })

type abc = (typeof inner)['on']

app.start([
  'inner',
  'superInner',
  '100',
  // '1',
  // '2',
  // '3',
  // '4',
  // '5',
  // '6',
  // '7',
  // '8',
  // '9',
  '--silent',
  'test',
  '--files',
  'hello',
  'world',
  '--files',
  'super',
  '--files',
  'array',
  // '-h',
])
