import askCli from '../helpers/ask-cli'

const r1 = askCli.array('What is your favorite hobbies?', 'number')

const r2 = askCli.tuple('What is your favorite hobbies?', [
  'string',
  'number',
  'boolean',
])

console.log('RESULT:', r2)
