import colors from '../lib/colors'

export default function (name: string, booleanFalseEnding?: string) {
  if (name.length == 0) {
    throw new Error(`Flag name cannot be empty`)
  }

  if (name.includes(' ')) {
    throw new Error(`Flag \`${colors.cyan(name)}\` can not contain spaces`)
  }

  if (name.startsWith('-')) {
    throw new Error(`Flag \`${colors.cyan(name)}\` should not start with '-'`)
  }

  if (name.includes('=')) {
    throw new Error(`Flag \`${colors.cyan(name)}\` should not contain '='`)
  }

  if (booleanFalseEnding && name.endsWith(booleanFalseEnding)) {
    throw new Error(
      `Flag \`${colors.cyan(
        name
      )}\` should not end with \`${booleanFalseEnding}\``
    )
  }
}
