export default function (
  type: string,
  string: string,
  booleanFalseEnding?: string
) {
  if (string.length == 0) {
    throw new Error(`${type} name cannot be empty`)
  }

  if (string.includes(' ')) {
    throw new Error(`${type} "${string}" can not contain spaces`)
  }

  if (string.startsWith('-')) {
    throw new Error(`${type} "${string}" should not start with "-"`)
  }

  if (string.includes('=')) {
    throw new Error(`${type} "${string}" should not contain "="`)
  }

  if (booleanFalseEnding && string.endsWith(booleanFalseEnding)) {
    throw new Error(
      `${type} "${string}" should not end with "${booleanFalseEnding}"`
    )
  }
}
