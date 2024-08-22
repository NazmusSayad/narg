import NoArg from '..'
import * as fs from 'fs'

const config = NoArg.createConfig({
  flags: { list: NoArg.array(NoArg.string()) },
  system: { splitListByComma: true },
})

NoArg.create('app', config)
  .on((args, flags) => {
    console.log('args:', args)
    console.log('flags:', flags)

    // fs.writeFileSync('output.json', JSON.stringify({ args, flags }, null, 2))
  })
  .start(['--list', 'item1,item2,item3,item4, item5', 'item6'])
