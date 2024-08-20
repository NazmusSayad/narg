import colors from '../lib/colors'

export default function (string: string, booleanFalseEnding?: string) {
  if (string.length == 0) {
    throw new Error(`Flag name cannot be empty`)
  }

  if (string.includes(' ')) {
    throw new Error(`Flag \`${colors.cyan(string)}\` can not contain spaces`)
  }

  if (string.startsWith('-')) {
    throw new Error(`Flag \`${colors.cyan(string)}\` should not start with '-'`)
  }

  if (string.includes('=')) {
    throw new Error(`Flag \`${colors.cyan(string)}\` should not contain '='`)
  }

  if (booleanFalseEnding && string.endsWith(booleanFalseEnding)) {
    throw new Error(
      `Flag \`${colors.cyan(
        string
      )}\` should not end with \`${booleanFalseEnding}\``
    )
  }
}
