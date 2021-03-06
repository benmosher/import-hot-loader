var recast = require('recast')
  , b = recast.types.builders
  , n = recast.types.namedTypes

var MAP_NAME = '__hotModules'

module.exports = function transform(ast) {
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
        path.replace(replacement)
      }
      return false
    },

    visitAssignmentExpression: function (path) {
      if (n.Identifier.check(path.node.right) && 
          path.node.right.name in lookup &&
          n.MemberExpression.check(path.node.left) &&
          n.Identifier.check(path.node.left.property)) {
        // rewrite to getter
        var replacement = b.callExpression(
          b.memberExpression(b.identifier('Object'), b.identifier('defineProperty')),
          [ path.node.left.object
          , b.literal(path.node.left.property.name)
          , b.objectExpression([ 
              b.property('init', b.identifier('get'), 
                b.functionExpression(null, [], b.blockStatement([
                  b.returnStatement(dynamicReference(path.node.right.name))
                ])))
            ])
          ]
          )

        path.replace(replacement)

        // don't continue down this path
        return false
      } 

      this.traverse(path)
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
    ast.program.body.unshift(
      b.variableDeclaration('const', [
        b.variableDeclarator(b.identifier(MAP_NAME), 
          b.objectExpression(imported.map(function (moduleName) {
            return b.property('init', b.literal(moduleName), 
              b.callExpression(b.identifier('require'), [ b.literal(moduleName) ]))
          })))
      ]))
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