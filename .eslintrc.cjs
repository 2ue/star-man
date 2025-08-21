module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off', // handled by @typescript-eslint/no-unused-vars
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'out/',
    'lib/',
    'coverage/',
    '.next/',
    '.turbo/',
    '.vercel/',
    'packages/*/dist/',
    'packages/*/build/',
    'packages/*/out/',
  ],
}; 