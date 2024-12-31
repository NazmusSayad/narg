import NoArg from '..'

const app = NoArg.create('app', {
  flags: {
    known: NoArg.string(),
    do: NoArg.boolean(),
    no: NoArg.boolean(),
  },

  system: {
    skipUnknownFlag: true,
    allowDuplicateFlagForPrimitive: true,
    allowMultipleValuesForPrimitive: true,
    allowDuplicateFlagForList: true,
    doNotExitOnError: true,
  },
})

app.on(([], flags) => {
  console.log(flags)
})

app.start([
  '--known',
  'value1',
  '--do',
  '--unknown',
  'value',
  'value',
  'value',
  '--no',
  '12432134',
  '-h',
])
