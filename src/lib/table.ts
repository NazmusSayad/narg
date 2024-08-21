import MJSTable from 'cli-table3'
import * as CJSTable from 'cli-table3'
import currentModule from './currentModule'

const Table = currentModule.isCJS
  ? CJSTable
  : currentModule.isESM
  ? MJSTable
  : (null as never)

export default Table!
