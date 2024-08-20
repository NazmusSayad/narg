import mjs from 'ansi-colors'
import * as cjs from 'ansi-colors'
import currentModule from './currentModule'

const colors = currentModule.isCJS ? cjs : currentModule.isESM ? mjs : null
if (!colors) throw new Error('Unknown module system')

export default colors!
