// @ts-ignore
const isCJS = typeof module !== 'undefined' && typeof exports !== 'undefined'

const isESM =
  // @ts-ignore
  typeof __filename === 'undefined' || typeof __dirname === 'undefined'

if (!isCJS && !isESM) {
  throw new Error('Unknown module system')
}

export default { isCJS, isESM }
