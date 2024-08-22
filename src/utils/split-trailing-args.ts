export default function (
  args: string[] = process.argv.slice(2),
  separator: string
): [string[], string[]] {
  const mainArgs: string[] = []
  const trailingArgs: string[] = []

  let separatorFound = false
  args.forEach((arg) => {
    if (arg === separator) {
      return (separatorFound = true)
    }

    if (separatorFound) {
      trailingArgs.push(arg)
    } else {
      mainArgs.push(arg)
    }
  })

  return [mainArgs, trailingArgs] as const
}
