import NoArg from '..'

console.log(NoArg.string().toCase('lower').minLength(7).parse('HELLO'))

// askCli
//   .string('What is your name?', {
//     minLength: 3,
//     maxLength: 20,
//     regex: /^[a-zA-Z]+$/,
//     toCase: 'lower',
//   })
//   .then(console.log)
