import NoArg from '../NoArg'
import schema from '../schema'

const app = NoArg.create(
  'app',
  {
    description: 'This is an app',
    // flags: { test: schema.string() },
    globalFlags: { silent: schema.string() },
    config: { disableHelp: true },
    system: { booleanNotSyntaxEnding: '--' },
  },
  () => {}
)

const inner = app.create(
  'inner',
  {
    config: {
      disableHelp: false,
      // skipGlobalFlags: true,
    },

    globalFlags: { test: schema.string() },
  },
  () => {}
)

const superInner = inner.create(
  'superInner',
  {
    config: {
      // disableHelp: false,
      // skipGlobalFlags: true,
    },
  },
  () => {}
)

console.log(app.name)
console.log(app.options)
console.log(app.config)
