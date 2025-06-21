/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["./jest.int.env.ts"],
  testMatch: ["**/*.int.test.ts"],
  coverageDirectory: "coverage/unit", 
  displayName: 'integration',
};
