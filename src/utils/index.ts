export function getArrayLengthStr(
  minLength?: number,
  maxLength?: number
): string {
  if (minLength && maxLength) return minLength + '-' + maxLength
  if (minLength) return minLength + '-' + '∞'
  if (maxLength) return 0 + '-' + maxLength
  return ''
}
