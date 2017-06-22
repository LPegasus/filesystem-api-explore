/* eslint-disable */
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const isProduction = process.env.NODE_ENV === 'production';
const commonsChunkPlugin = new webpack.optimize.CommonsChunkPlugin({
  filename: 'common.js',
  name: 'common',
});

// const uglifyJSPlugin = new webpack.optimize.UglifyJsPlugin({
//   compress: {
//     warnings: false,
//     drop_console: false,
//   }
// });

module.exports = {
  entry: {
    index: './src/index',
  },
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: '[name].js',
    crossOriginLoading: 'anonymous',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: ['.js', '.jsx'],
        use: [
          'babel-loader',
        ],
        exclude: ['node_modules']
      }
    ]
  },
  // devtool: 'source-map',
  devServer: {
    compress: true, // enable gzip compression
    historyApiFallback: false, // true for index.html upon 404, object for multiple paths
    hot: false, // hot module replacement. Depends on HotModuleReplacementPlugin
    watchOptions: {
      ignored: /node_modules/,
      poll: 1000
    },
    publicPath: '/',
    port: 8080,
    disableHostCheck: true,
  },

  watch: true,

  plugins: [
    new ExtractTextPlugin({
      filename: '[name].css'
    }),
    commonsChunkPlugin,
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin()
    // uglifyJSPlugin
  ]
};
