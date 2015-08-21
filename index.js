var recast = require('recast')
  , b = recast.types.builders

var lookupMapName = '__hotDependencyHash'

module.exports = function importHotLoader(source/*todo: map*/) {
  this.cacheable()

  // step 1: parse
  var ast = recast.parse(source, { esprima: require('acorn')
                                 , ecmaVersion: 6
                                 , sourceType: 'module' 
                                 })
  // console.log(ast)

  // step 2: find imports
  var lookup = {}
  recast.visit(ast, {
    visitImportSpecifier: function (path) {
      var specifier = path.value
        , declaration = path.parentPath.parentPath.value
      lookup[specifier.local.name] = { moduleSource: declaration.source.value
                                     , importedName: specifier.imported.name
                                     }
      this.traverse(path)
    }
  })

  // step 3: write 'dynamic' map, rewrite all references to imports to it
  recast.visit(ast, {
    visitIdentifier: function (path) {
      if (path.value.name in lookup) {
        var spec = lookup[path.value.name]
        // todo: rewrite bind to arrow expression if object of [x].bind(...)
        var replacement = b.memberExpression(
          b.memberExpression( b.identifier(lookupMapName)
                            , b.literal(spec.moduleSource)
                            , true
                            ),
          b.literal(spec.importedName),
          false)
        console.log(replacement)
      }
      return false
    }
  })
  // step 4: write module.hot acceptors (possibly as a runtime reference)

  // may want to:
  // - check for assigments/closures and react appropriately
  
  return source
}