// babel.config.js
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
  // You generally don't need explicit plugins for optional chaining/nullish coalescing
  // if you're using a recent @babel/preset-env version.
};