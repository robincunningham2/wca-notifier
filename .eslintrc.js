
module.exports = {
    root: true,
    env: {
        es2021: true,
        node: true,
    },
    extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'google',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module',
    },
    plugins: [
        '@typescript-eslint',
    ],
    rules: {
        'indent': [ 'error', 4 ],
        'max-len': [ 'error', 120 ],
        'quotes': [ 'error', 'single' ],
        'semi': [ 'error', 'always' ],
        'require-jsdoc': [ 'off' ],
        'no-console': [ 'error' ],
        'object-curly-spacing': [ 'error', 'always' ],
        'array-bracket-spacing': [ 'error', 'always' ],
        'block-spacing': [ 'error', 'always' ],
        '@typescript-eslint/no-unused-vars': [ 'error' ],
        'no-unused-vars': [ 'off' ],
        'sort-imports': [
            'error',
            {
                ignoreCase: false,
                ignoreDeclarationSort: true,
                ignoreMemberSort: false,
                memberSyntaxSortOrder: [ 'none', 'all', 'single', 'multiple' ],
            },
        ],
    },
};
