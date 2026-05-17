/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  maxWorkers: 1,
  // jwks-rsa depends on jose (ESM) which ts-jest cannot transpile in CJS mode.
  // Replace it globally with a hand-written stub.
  moduleNameMapper: {
    '^jwks-rsa$': '<rootDir>/src/__mocks__/jwks-rsa.ts',
  },
};

module.exports = config;
