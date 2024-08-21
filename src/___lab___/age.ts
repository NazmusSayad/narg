import NoArg, { t } from '../index'

const result = NoArg.create('noarg', {
  description: 'NoArg is a simple library to create command line arguments',

  arguments: [
    {
      name: 'name',
      type: t.string().ask('What is your name?').default('John Doe'),
    },
  ],
})
  .on(([name, age]) => {
    console.log(`Hello ${name}, you are ${age} years old!`)
  })
  .start([])
