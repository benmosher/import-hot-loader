console.log('loaded main.js')
document.write('wheeee')

import { pure } from './mod'

window.dynamic = function (x) { return lookup[test](x) }

if (module.hot) {
  module.hot.accept('./mod', function () {
    var updatedModule = require('./mod')
    dynamicReference['./mod'] = updatedModule
  })
}