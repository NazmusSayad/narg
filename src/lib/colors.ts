import currentModule from '../currentModule'
import * as cjs from 'ansi-colors'
import mjs from 'ansi-colors'

const colors = currentModule.isCJS
  ? cjs
  : currentModule.isESM
  ? mjs
  : null

if (!colors) throw new Error('Unknown module system')

export default colors!
