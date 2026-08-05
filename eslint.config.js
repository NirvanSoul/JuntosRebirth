const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['coverage/*', 'dist/*', 'android/*', 'ios/*']),
  expoConfig,
  {
    rules: {
      'no-console': ['error', { allow: ['error'] }],
    },
  },
]);
