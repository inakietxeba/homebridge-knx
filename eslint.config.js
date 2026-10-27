'use strict';

// Adapted from upstream: catch defects without restyling the legacy codebase.
module.exports = [
    { ignores: ['node_modules/**'] },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                require: 'readonly', module: 'writable', exports: 'writable',
                process: 'readonly', console: 'readonly', __dirname: 'readonly',
                __filename: 'readonly', Buffer: 'readonly', global: 'readonly',
                setTimeout: 'readonly', clearTimeout: 'readonly',
                setInterval: 'readonly', clearInterval: 'readonly',
                knxRequire: 'readonly'
            }
        },
        linterOptions: { reportUnusedDisableDirectives: true },
        rules: {
            'no-undef': 'error',
            'no-dupe-keys': 'error',
            'no-dupe-args': 'error',
            'no-duplicate-case': 'error',
            'no-unreachable': 'error',
            'no-func-assign': 'error',
            'no-cond-assign': 'error',
            'no-const-assign': 'error',
            'no-fallthrough': 'off', // knxaccess.js intentionally falls through
            'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
            'no-empty': ['warn', { allowEmptyCatch: true }]
        }
    }
];
