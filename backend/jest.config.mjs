/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/routes/users.ts',
    'src/middleware/auth.ts',
    'src/middleware/errorHandler.ts',
    'src/services/logService.ts',
  ],
  coverageThreshold: {
    'src/routes/users.ts': {
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
    },
  },
  verbose: true,
  forceExit: true,
  testTimeout: 30000,
};
