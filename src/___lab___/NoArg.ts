import NoArgRoot from '../NoArg/index'
import schema from '../schema/index'

const app = NoArgRoot.create('app', {
  description: 'This is an app',
  flags: {
    zzzz: schema.string(),
    test: schema.string().required(),
    test2: schema.string().required(),
    sql: schema.string().required(),
    sql2: schema.string().required(),
    sup: schema.string(),
    abc: schema.string().required().ask("What's your name?"),
  },
  globalFlags: { silent: schema.string() },
  config: { disableHelp: true },
  arguments: [{ name: 'root' }],
  optionalArguments: [{ name: 'nope', type: schema.number() }],
  system: {
    booleanNotSyntaxEnding: '!',
  },
  listArgument: { name: 'test' },
}).on((args, flags) => {
  console.log(args, flags)
})

// app.help()

const inner = app
  .create('inner', {
    description: 'This is an inner for app',
    config: { disableHelp: false, skipGlobalFlags: true },
    arguments: [{ name: 'testsdf' }],
    listArgument: { name: 'test', type: schema.number() },
    globalFlags: { test: schema.string('boom', 'super') },
  })
  .on((args, flags) => {
    console.log(args, flags)
  })

const inner2 = app
  .create('inner2', {
    config: { disableHelp: false, skipGlobalFlags: true },
    arguments: [{ name: 'testsdf' }],
    listArgument: { name: 'test', type: schema.number() },
    globalFlags: { test: schema.string('boom', 'super') },
  })
  .on((args, flags) => {
    console.log(args, flags)
  })

const superInner = inner
  .create('superInner', {
    arguments: [{ name: 'joss', type: schema.number() }],
    optionalArguments: [{ name: 'nope', type: schema.number() }],
    config: { disableHelp: false, skipGlobalFlags: false },
  })
  .on((args, flags) => {
    console.log(args, flags)
    console.log(args, flags)
    console.log(args, flags)
  })

app.usage()
// inner.help()
// superInner.help()

const gitApp = NoArgRoot.create('git', {
  flags: { quiet: schema.string() },
}).on((args, flags) => {
  console.log(args, flags)
})

const gitClone = gitApp
  .create('clone', {
    description: 'Clone a repository into a new directory',

    arguments: [
      {
        name: 'url',
        type: schema.string(),
        description: 'The url to clone from',
      },
    ],
    flags: { force: schema.boolean().description('Do something...') },
  })
  .on((args, flags) => {})
