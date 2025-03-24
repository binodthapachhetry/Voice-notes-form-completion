module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        electron: '28.0'
      },
      useBuiltIns: 'usage',
      corejs: 3
    }]
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-syntax-dynamic-import'
  ],
  env: {
    development: {
      sourceMaps: 'inline',
      plugins: ['source-map-support']
    },
    production: {
      presets: [
        ['minify', {
          builtIns: false,
          evaluate: false,
          mangle: false
        }]
      ]
    }
  }
};
