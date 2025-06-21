/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*Service.ts"],
  setupFiles: ["./jest.int.env.ts"],
  testMatch: ["**/*.int.test.ts"],
};
