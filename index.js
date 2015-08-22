var recast = require('recast')
  , b = recast.types.builders

var lookupMapName = '__hotModules'

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

function transform(ast) {
  var lookup = {}

  recast.visit(ast, {
    // step 2: find imports
    visitImportSpecifier: function (path) {
      var specifier = path.value
        , declaration = path.parent.node
      lookup[specifier.local.name] = { moduleSource: declaration.source.value
                                     , importedName: specifier.imported.name
                                     }
      return false // don't traverse deeper
    },

    // step 3: write 'dynamic' map, rewrite all references to imports to it
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
          true)

        replaceNode(path, replacement)
      }
      return false
    }
  })
  // step 4: write module.hot acceptors:
  // if (module.hot) {
  //   module.hot.accept('./mod', function () {
  //     var updatedModule = require('./mod')
  //     dynamicReference['./mod'] = updatedModule
  //   })
  //   
  //   // ... one for each hot module
  // }

  // may want to:
  // - check for module-scoped assigments/closures and react appropriately
  
  return ast
}

function replaceNode(path, replacement) {
  path.parent.node[path.name] = replacement
}