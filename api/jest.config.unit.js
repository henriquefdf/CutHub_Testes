/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  coverageDirectory: "coverage/unit", 
  displayName: 'unit',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  testPathIgnorePatterns: ['.*\\.int\\.test\\.ts$'],


};
