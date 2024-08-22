import NoArg from '..'

NoArg.create('noarg', {
  description: 'NoArg is a simple library to create command line arguments',

  // arguments: [
  //   {
  //     name: 'name',
  //     type: t
  //       .string()
  //       .ask('What is your name?')
  //       .default('John Doe')
  //       .toCase('upper'),
  //   },
  // ],

  flags: {
    demo: NoArg.string().ask().default('John Doe').toCase('upper'),
    nDemo: NoArg.number(1, 2, 3).ask('What is your number?').default(1),

    // name: t
    //   .tuple(
    //     t.string().default('John Doe').toCase('upper').minLength(5),
    //     t.boolean()
    //   )
    //   .ask('What is your name list ?'),
  },
})
  .on((arg, flags) => {
    console.log(arg)
    console.log(flags)
  })
  .start([])
// .start(['--name', 'john', 'doe'])
