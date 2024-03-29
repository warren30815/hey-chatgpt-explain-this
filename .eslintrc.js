module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  globals: {
    expect: true,
  },
  extends: ['prettier', 'airbnb-base'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  rules: {
    semi: 'off',
    quotes: ['warn', 'single'],
    indent: ['warn', 'tab'],
    '@typescript-eslint/no-explicit-any': 'off',
    'max-len': [
      'warn',
      {
        code: 160,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignorePattern: '^\\s*var\\s.+=\\s*require\\s*\\(',
      },
    ],
    'no-unref': 'off',
    'no-undef': 'off',
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'no-tabs': 'off',
    'no-restricted-syntax': 'off',
    'no-unsafe-optional-chaining': 'off',
    'func-names': 'off',
    'arrow-parens': ['error', 'as-needed'],
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: { consistent: true, multiline: true },
        ObjectPattern: { consistent: true, multiline: true },
        ImportDeclaration: { consistent: true, multiline: true },
        ExportDeclaration: { multiline: true, minProperties: 3 },
      },
    ],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        mjs: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
  },
  settings: {
    'import/resolver': {
      alias: {
        map: [['@', './src']],
        extensions: ['.ts', '.js', '.jsx', '.json'],
      },
    },
  },
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
    withDefaults: 'readonly',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'], // Your TypeScript files extension
      // As mentioned in the comments, you should extend TypeScript plugins here,
      // instead of extending them outside the `overrides`.
      // If you don't want to extend any rules, you don't need an `extends` attribute.
      extends: ['airbnb-typescript/base'],

      parserOptions: {
        project: ['./tsconfig.json'], // Specify it only for TypeScript files
      },
      rules: {
        semi: 'off',
        'no-restricted-globals': 'off',
        '@typescript-eslint/semi': ['error', 'never'],
        '@typescript-eslint/indent': ['warn', 4],
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'off',
        'no-unused-vars': 'warn',
        'no-console': 'off',
        'no-tabs': 'off',
        'no-restricted-syntax': 'off',
        'func-names': 'off',
        'arrow-parens': ['error', 'as-needed'],
      },
    },
  ],
}
