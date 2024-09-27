import { CellValue } from 'cli-table3'
import Table from '../lib/table'

const MAX_WIDTH = 120
const MIN_WIDTH = 40
const terminalWidth = process.stdout.columns - 4
const tableWidth =
  terminalWidth > MAX_WIDTH
    ? MAX_WIDTH
    : terminalWidth < MIN_WIDTH
    ? MIN_WIDTH
    : terminalWidth

type CustomTableItems<TArray extends number[]> = {
  [K in keyof TArray]: K extends `${number}` ? CellValue : TArray[K]
}

export function CustomTable<const TWidths extends number[]>(
  { sizes, ...options }: { sizes: TWidths; border?: boolean },
  ...items: CustomTableItems<TWidths>[]
) {
  const maxLength = Math.max(...items.map((item) => item.length))
  const totalWidth = sizes.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0
  const colWidths = sizes.map((width) => {
    return Math.floor((tableWidth / totalWidth) * (width ?? 1))
  })

  const table = new Table!({
    style: options.border
      ? {}
      : { compact: true, 'padding-left': 0, 'padding-right': 0 },
    chars: options.border
      ? {
          'top-left': '╭',
          'bottom-left': '╰',
          'top-right': '╮',
          'bottom-right': '╯',
        }
      : {
          'bottom-left': '',
          'bottom-mid': '',
          'bottom-right': '',
          'left-mid': '',
          'mid-mid': '',
          'right-mid': '',
          'top-left': '',
          'top-mid': '',
          'top-right': '',
          bottom: '',
          left: '',
          middle: '',
          mid: '',
          right: '',
          top: '',
        },

    colWidths,
    wordWrap: true,
    rowAligns: maxLength > 0 ? new Array(maxLength).fill('top') : [],
  })

  table.push(...items)
  console.log(table.toString())
}
