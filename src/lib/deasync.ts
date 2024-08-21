import mjs from 'deasync'
import * as cjs from 'deasync'
import currentModule from './currentModule'

const deasyncCpp = currentModule.isCJS
  ? cjs
  : currentModule.isESM
  ? mjs
  : (null as never)

export default function deasync(promiseFN: any) {
  async function asyncFunction(callback: any) {
    try {
      callback(null, await promiseFN())
    } catch (err) {
      callback(err)
    }
  }

  const syncFunction = deasyncCpp(asyncFunction)
  return syncFunction()
}
