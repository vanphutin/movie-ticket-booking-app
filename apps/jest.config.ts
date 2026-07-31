import type { Config } from 'jest';

const config: Config = {
  collectCoverageFrom: [
    'api-gateway/src/**/*.ts',
    'identity-service/src/**/*.ts',
    'libs/*/src/**/*.ts',
    '!**/main.ts',
  ],
  moduleNameMapper: {
    '^@movie-ticket/auth-contract$': '<rootDir>/libs/auth-contract/src',
    '^@movie-ticket/observability$': '<rootDir>/libs/observability/src',
  },
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/test/unit/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};

export default config;
