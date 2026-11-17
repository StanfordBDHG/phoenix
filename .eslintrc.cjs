module.exports = {
    extends: ['react-app'],
    plugins: ['jest'],
    env: {
        'jest/globals': true,
    },
    root: true,
    ignorePatterns: [
        'dist/',
        'node_modules/',
        'coverage/',
        'test-results/',
        'playwright-report/',
        // Generated FHIR R4 type definitions.
        'src/types/fhir.ts',
    ],
};
