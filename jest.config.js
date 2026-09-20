/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: [
    '<rootDir>/apps/**/src/**/*.spec.ts',
    '<rootDir>/packages/**/src/**/*.spec.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '<rootDir>/packages/frontend/'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },
};
