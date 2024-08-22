import MJSTable from 'cli-table3'
import * as CJSTable from 'cli-table3'
import currentModule from './currentModule'

export default currentModule.isCJS
  ? CJSTable
  : currentModule.isESM
  ? MJSTable
  : (null as never)
