import mjs from 'deasync'
import * as cjs from 'deasync'
import currentModule from './currentModule'

const deasync = currentModule.isCJS ? cjs : currentModule.isESM ? mjs : null
if (!deasync) throw new Error('Unknown module system')

export default deasync!
