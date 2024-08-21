import NoArg, { t } from '../index'

NoArg.create('noarg', {
  description: 'NoArg is a simple library to create command line arguments',

  arguments: [
    {
      name: 'name',
      type: t.string().ask('What is your name?'),
    },
    {
      name: 'age',
      type: t.number().ask('How old are you?').default(18),
    },
  ],
})
  .on(([name, age]) => {
    console.log(`Hello ${name}, you are ${age} years old!`)
  })
  .start(['John'])
