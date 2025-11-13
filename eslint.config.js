const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const prettierPlugin = require('eslint-plugin-prettier');
const nextPlugin = require('@next/eslint-plugin-next');

module.exports = [
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        ignores: ['node_modules/**', '.next/**', 'dist/**', 'build/**','.turbo/**'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true }
                
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            prettier: prettierPlugin,
            '@next/next': nextPlugin,
        },
        rules: {
            // TypeScript-specific adjustments
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-shadow': 'off',
            '@typescript-eslint/no-shadow': ['error'],

            // React / JSX
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',

            // Prefer consistent returns
            'consistent-return': 'warn',

            // Let Prettier handle formatting
            'prettier/prettier': 'error',
        },
        settings: {
            react: { version: 'detect' },
        },
        linterOptions: { reportUnusedDisableDirectives: true },
    },

    // Frontend (Next.js) specific rules
    {
        files: [
            '/apps/frontend/**/*.{ts,tsx,js,jsx}',
        ],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
        },
        env: { browser: true, es2022: true },
        rules: {
            // Next.js and React specifics
            'react/jsx-filename-extension': ['warn', { extensions: ['.tsx', '.jsx'] }],
            '@next/next/no-img-element': 'warn',
            '@next/next/no-html-link-for-pages': 'off', // adjust if you have custom routing
        },
    },

    // Backend (Express / Node) specific rules
    {
        files: [
            '/apps/backend/**/*.{ts,tsx,js,jsx}',
        ],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: [ './tsconfig.eslint.json'],
                tsconfigRootDir: __dirname
            },
        },
        
        env: { node: true, es2022: true },
        rules: {
            // Node/Express code often uses console for logging; allow it
            'no-console': 'off',

            // Allow require in server files if needed
            '@typescript-eslint/no-var-requires': 'off',

            // Keep prettier integration
            'prettier/prettier': 'error',
        },
    },
];