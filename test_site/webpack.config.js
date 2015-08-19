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
      , loader: "babel"
      , exclude: /node_modules/
      }
    ]
  }
};