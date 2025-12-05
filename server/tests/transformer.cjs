const tsJest = require('ts-jest').default;

module.exports = tsJest.createTransformer({
  useESM: true,
  tsconfig: {
    module: 'esnext',
    isolatedModules: true,
  },
});