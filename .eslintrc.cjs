
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
    },
    plugins: [
        '@typescript-eslint',
        'prettier',
        'import',
        'react',
        'react-hooks'
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended'
    ],
    ignorePatterns: ['**/.next/**','dist/','build/','out/','.turbo/','coverage/','node_modules/'],
    settings: {
        react: { version: 'detect' },
        'import/resolver': {
            typescript: {
                project: [
                    './apps/frontend/tsconfig.eslint.json',
                    './apps/backend/tsconfig.eslint.json'
                ],
                alwaysTryTypes: true
            }
        }
    },
    rules: {
        // Prettier integration
        'prettier/prettier': 'error',

        // General
        'no-console': 'warn',

        // TypeScript
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'warn',

        // React
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off'
    },
    overrides: [
        // TypeScript specific adjustments
        {
            files: ['**/*.ts', '**/*.tsx'],
            rules: {
                'no-undef': 'off',
                '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
            }
        },

        // Next.js frontend workspaces
        {
            files: ['apps/frontend/**/*.{ts,tsx,js,jsx}'],
            env: {node: false, browser: true, es2021: true},
            extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended', 'next/core-web-vitals']
        },

        // Express backend
        {
            files: ['apps/backend/**/*.{ts,js}'],
            env: { node: true, browser: false, es2021: true },
            extends: ['plugin:n/recommended', 'plugin:promise/recommended'],
            rules: {
                'no-console': 'off',
                'n/no-missing-import': 'off', 
                'n/no-unsupported-features/es-syntax': 'off'
            }
        },

        // JS files (allow require)
        {
            files: ['**/*.js'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off'
            }
        }
    ]
};