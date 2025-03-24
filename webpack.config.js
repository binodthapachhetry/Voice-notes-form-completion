const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { EnvironmentPlugin } = require('webpack');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    main: './src/backend/main.js',
    preload: './src/backend/preload.js',
    renderer: './src/frontend/renderer.js'
  },
  target: 'electron-main',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    publicPath: './'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource'
      },
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json'],
    fallback: {
      crypto: false,
      stream: false,
      buffer: false,
      path: false
    }
  },
  plugins: [
    new EnvironmentPlugin({
      NODE_ENV: 'development'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/frontend/index.html', to: 'index.html' },
        { from: 'src/frontend/styles.css', to: 'styles.css' },
        { from: 'src/frontend/models', to: 'models' }
      ]
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true
  }
};
