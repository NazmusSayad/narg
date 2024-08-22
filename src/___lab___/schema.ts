import { TypeArray } from '../schema/TypeArray'
import { TypeNumber } from '../schema/TypeNumber'
import { TypeString } from '../schema/TypeString'

import schema from '../schema/index'

const complex = schema.array(schema.string('sdf'))

