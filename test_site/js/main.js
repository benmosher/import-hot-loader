console.log('loaded main.js')
document.write('wheeee')

import { pure } from './mod'

window.dynamic = function (x) { return pure(x) }