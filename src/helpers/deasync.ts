import * as deasyncCPP from 'deasync'

export default function deasync(promiseFN: any) {
  async function asyncFunction(callback: any) {
    try {
      callback(null, await promiseFN())
    } catch (err) {
      callback(err)
    }
  }

  const syncFunction = deasyncCPP(asyncFunction)
  return syncFunction()
}
