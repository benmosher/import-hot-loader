var path = require('path')

module.exports = {
  entry: "./js/main.js",

  output: {
    path: "./build",
    publicPath: "/build/",
    filename: "bundle.js"
  },
  module: {
    loaders: [
      { test: /\.js$/
      , loaders: [ "babel", path.join(__dirname, '..') ]
      , exclude: /\/node_modules\//
      }
    ]
  }
};