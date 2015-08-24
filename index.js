var recast = require('recast')
  , transform = require('./transform')

module.exports = function importHotLoader(source/*todo: map*/) {
  this.cacheable()

  // step 1: parse
  var ast = recast.parse(source, { esprima: require('acorn')
                                 , ecmaVersion: 6
                                 , sourceType: 'module' 
                                 })

  ast = transform(ast)
  
  return recast.print(ast).code
}
