console.log('loaded main.js')
document.write('wheeee')

import { pure } from './mod'
const dynamic = { './mod': { 'pure': pure } }

if (module.hot) {

  module.hot.accept('./mod', function () {
    const mod = require('./mod')
    dynamic['./mod']['pure'] = mod['pure']
    
    console.log('pure(10):' + dynamic['./mod']['pure'](10))
  })
}