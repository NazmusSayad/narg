import Table from '../lib/table'
import { CellValue } from 'cli-table3'

const MIN_WIDTH = 30
const terminalWidth = process.stdout.columns - 3
const tableWidth = terminalWidth < MIN_WIDTH ? MIN_WIDTH : terminalWidth

type CustomTableItems<TArray extends CustomTableSize[]> = CellValue[] & {
  length: TArray['length']
}

type CustomTableSize = {
  flex: number
  minWidth?: number
  maxWidth?: number
}

export function CustomTable<const TWidths extends CustomTableSize[]>(
  { sizes, ...config }: { sizes: TWidths; border?: boolean },
  ...items: CustomTableItems<TWidths>[]
) {
  const columnsCount = Math.max(...items.map((item) => item.length))
  let availableWidth = tableWidth - columnsCount
  let combinedFlex =
    sizes.reduce((total, { flex }) => (total ?? 0) + (flex ?? 0), 0) ?? 0

  const colWidths = sizes.map((size) => {
    function getWidth() {
      const width = Math.floor(
        (availableWidth / combinedFlex) * (size.flex ?? 1)
      )

      if (size.minWidth && width < size.minWidth) return size.minWidth
      if (size.maxWidth && width > size.maxWidth) return size.maxWidth
      return width
    }

    const width = getWidth()
    availableWidth -= width
    combinedFlex -= size.flex
    return width
  })

  const table = new Table!({
    style: config.border ? {} : { compact: true },
    chars: config.border
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
    rowAligns: columnsCount > 0 ? new Array(columnsCount).fill('top') : [],
  })

  table.push(...items)
  console.log(table.toString())
}
