import mjs from 'ansi-colors'
import * as cjs from 'ansi-colors'
import currentModule from './currentModule'

export default currentModule.isCJS
  ? cjs
  : currentModule.isESM
  ? mjs
  : (null as never)
