
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        esmodules: true, // Target environments that support ES Modules
        browsers: 'last 2 versions', // Or more specific browser targets
      },
    }],
    '@babel/preset-react', // For JSX
  ],

  env: {
    production: { // These plugins will only be active when NODE_ENV is 'production'
      plugins: [
        'transform-remove-console', // This removes console.* calls

      ],
    },

  },
};