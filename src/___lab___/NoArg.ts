import NoArg from '../NoArg'
import schema from '../schema'

const app = NoArg.create('app', {
  description: 'This is an app',
  flags: { test: schema.string() },
  globalFlags: { silent: schema.string() },
  config: { disableHelp: true },
  arguments: [{ name: 'testsdf' }],
  system: {
    booleanNotSyntaxEnding: '--',
  },
  listArgument: { name: 'test' },
}).on((setup) => {
  console.log(setup.flags)
})

const inner = app.create('inner', {
  config: { disableHelp: false, skipGlobalFlags: true },
  arguments: [{ name: 'testsdf' }],
  listArgument: { name: 'test' },
  globalFlags: { test: schema.string() },
})

app.options.arguments
inner.options.globalFlags

const superInner = inner
  .create('superInner', {
    config: { disableHelp: false, skipGlobalFlags: false },
  })
  .on((setup) => {
    console.log(setup.flags.test)
  })

console.log(superInner.options.globalFlags)
