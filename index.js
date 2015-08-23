var recast = require('recast')
  , b = recast.types.builders

var MAP_NAME = '__hotModules'

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
    , imported = []

  function dynamicReference(to) {
    var spec = lookup[to]

    return b.memberExpression(
      b.memberExpression( b.identifier(MAP_NAME)
                        , b.literal(spec.moduleSource)
                        , true
                        ),
      b.literal(spec.importedName),
      true)
  }


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

    visitImportDeclaration: function (path) {
      imported.push(path.node.source.value)
      this.traverse(path)
    },

    // step 3: write 'dynamic' map, rewrite all references to imports to it
    visitIdentifier: function (path) {
      if (path.value.name in lookup) {
        // todo: rewrite bind to arrow expression if object of [x].bind(...)
        var replacement = dynamicReference(path.value.name)
        replaceNode(path, replacement)
      }
      return false
    }
  })

  // step 4: write module.hot acceptors:
  function moduleAcceptor(moduleName) {
    return b.expressionStatement(b.callExpression(
      b.memberExpression( b.memberExpression( b.identifier('module')
                                           , b.identifier('hot')
                                           , false)
                        , b.identifier('accept')
                        , false
                        ),
      [ b.literal(moduleName)
      , b.functionExpression(null, [], b.blockStatement([
          b.expressionStatement(
            b.assignmentExpression(
              '=', 
              b.memberExpression( b.identifier(MAP_NAME)
                                , b.literal(moduleName)
                                , true),
              b.callExpression( b.identifier('require')
                              , [ b.literal(moduleName) ]
                              )
            )
          )
        ]))
      ]
    ))
  }
  if (imported.length) {
    ast.program.body.push(b.ifStatement(
      // b.memberExpression(b.identifier('module'), b.identifier('hot'), false),
      b.memberExpression(b.identifier('module'), b.identifier('hot')),
      b.blockStatement(imported.map(moduleAcceptor))))
  }
  // if (module.hot) {
  //   module.hot.accept('./mod', function () {
  //     var updatedModule = require('./mod')
  //     dynamicReference['./mod'] = updatedModule
  //   })
  //   // ... one for each hot module
  // }

  // may want to:
  // - check for module-scoped assigments/closures and react appropriately
  
  return ast
}

function replaceNode(path, replacement) {
  path.parent.node[path.name] = replacement
}