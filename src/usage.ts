import { NoArgConfig } from './config'
import colors from './lib/colors'
import { CustomTable } from './lib/table'

function printValid(...args: string[]) {
  console.log('  ', colors.green('✔   ' + args.join(' ')))
}

function printInvalid(...args: string[]) {
  console.log('  ', colors.red('✖   ' + args.join(' ')))
}

function printGroupHeader(...args: string[]) {
  console.log(' ⚙︎', colors.black(args.join(' ')))
}

function printPointHeader(...args: string[]) {
  console.log(' -', colors.black(args.join(' ')))
}

function tableGroup(name: string, result: string, ...args: string[]) {
  return [name, args.join('\n'), result] as any
}

function renderStructure() {
  printGroupHeader('Structure:')
  console.log(
    '',
    colors.yellow('commands'),
    colors.blue('fixed-arguments'),
    colors.green('list-arguments'),
    colors.red('options')
  )

  console.log(
    '',
    "This is the structure of the command line. It's the order of the arguments and options that you want to pass to the command. The order is important and can't be changed."
  )

  console.log('')
  printPointHeader(colors.yellow('commands'))
  console.log(
    '',
    "This is the command that you want to run. It's the first argument of the command line."
  )

  console.log('')
  printPointHeader(colors.blue('fixed-arguments'))
  console.log(
    '',
    "These are the arguments that you want to pass to the command. Their position and length is fixed and can't be changed."
  )

  console.log('')
  printPointHeader(colors.green('list-arguments'))
  console.log(
    '',
    'These are the arguments that you want to pass to the command. They are list of values and length can vary on configuration. They also can be optional.'
  )

  console.log('')
  printPointHeader(colors.red('options'))
  console.log(
    '',
    'These are the options that you want to pass to the command. They are optional and can be changed.'
  )
}

function renderHowToUseOptions() {
  printGroupHeader('How to use options:')
  CustomTable(
    [1, 3, 2],
    tableGroup('string', 'string', '--string string', '--string=string'),

    tableGroup('number', '100', '--number 100', '--number=100'),

    tableGroup(
      'boolean\n(true)',
      'true',
      '--boolean',
      '--boolean true',
      '--boolean=true',
      '--boolean yes',
      '--boolean=yes',
      colors.black("* Casing doesn't matter"),
      '--boolean YeS'
    ),

    tableGroup(
      'boolean\n(false)',
      'false',
      '--boolean!',
      '--boolean false',
      '--boolean=false',
      '--boolean no',
      '--boolean=no',
      colors.black("* Casing doesn't matter"),
      '--boolean fAlSe'
    ),

    tableGroup(
      'array\ntuple',
      "['value1', 'value2']",
      '--option value1 value2',
      '--option=value1 value2'
    )
  )
}

export default function (config: NoArgConfig) {
  console.log(colors.bold(colors.cyan('📝 How to use:')))

  renderStructure()
  console.log('')
  renderHowToUseOptions()
  console.log('')

  console.log(colors.bold(colors.cyan('📝 Configuration:')))

  {
    if (config.duplicateOption) {
      printGroupHeader('Duplicate option is enabled')
      printValid(colors.yellow('--option'), 'value')
      printValid(
        colors.black('--option value'),
        colors.yellow('--option'),
        'value'
      )
    } else {
      printGroupHeader('Duplicate option is disabled')
      printValid(colors.yellow('--option'), 'value')
      printInvalid(colors.yellow('--option'), 'value', 'value')
    }

    console.log('')
  }

  {
    if (config.duplicateValue) {
      printGroupHeader('Duplicate value is enabled')
      printValid(colors.yellow('--option'), 'value')
      printValid(colors.yellow('--option'), colors.black('value'), 'value')
    } else {
      printGroupHeader('Duplicate value is disabled')
      printValid(colors.yellow('--option'), 'value')
      printInvalid(colors.yellow('--option'), 'value', 'value')
    }

    console.log('')
  }

  {
    if (config.equalAssign) {
      printGroupHeader('Options with equal value is enabled')
      printValid(colors.yellow('--option'), 'value')
      printValid(colors.yellow('--option') + colors.blue('=') + 'value')
    } else {
      printGroupHeader('Options with equal value is disabled')
      printValid(colors.yellow('--option'), 'value')
      printInvalid(colors.yellow('--option') + colors.blue('=') + 'value')
    }

    console.log('')
  }
}
